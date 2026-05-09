-- =============================================
-- LIBRARY MANAGEMENT SYSTEM - Supabase Migration
-- =============================================

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('admin', 'reader')),
  max_loans_allowed INT NOT NULL DEFAULT 5 CHECK (max_loans_allowed > 0 AND max_loans_allowed <= 10),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authors
CREATE TABLE authors (
  author_id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  nationality TEXT,
  biography TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books
CREATE TABLE books (
  book_id SERIAL PRIMARY KEY,
  isbn TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category_id INT NOT NULL REFERENCES categories(category_id),
  publisher TEXT,
  publication_year INT CHECK (publication_year >= 1000 AND publication_year <= 2100),
  pages INT CHECK (pages > 0),
  description TEXT,
  total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_copies CHECK (available_copies <= total_copies)
);

-- Book Authors (Many-to-Many)
CREATE TABLE book_authors (
  book_author_id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
  author_id INT NOT NULL REFERENCES authors(author_id),
  author_order INT NOT NULL DEFAULT 1 CHECK (author_order > 0),
  UNIQUE(book_id, author_id)
);

-- Loans
CREATE TABLE loans (
  loan_id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(book_id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  loan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Returned', 'Overdue')),
  fine DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (fine >= 0),
  notes TEXT,
  CONSTRAINT chk_due_date CHECK (due_date > loan_date),
  CONSTRAINT chk_return_date CHECK (return_date IS NULL OR return_date >= loan_date)
);

-- Reservations
CREATE TABLE reservations (
  reservation_id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(book_id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiration_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Fulfilled', 'Cancelled', 'Expired')),
  notes TEXT,
  CONSTRAINT chk_exp_date CHECK (expiration_date > reservation_date)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_loans_user ON loans(user_id);
CREATE INDEX idx_loans_book ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_book ON reservations(book_id);
CREATE INDEX idx_reservations_status ON reservations(status);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Helper: get current user role (SECURITY DEFINER bypasses RLS to avoid circular dependency)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Decrease available copies when a loan is created
CREATE OR REPLACE FUNCTION decrease_available_copies()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Active' THEN
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = NEW.book_id;

    IF (SELECT available_copies FROM books WHERE book_id = NEW.book_id) < 0 THEN
      RAISE EXCEPTION 'No available copies for this book';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_loans_after_insert
  AFTER INSERT ON loans
  FOR EACH ROW EXECUTE FUNCTION decrease_available_copies();

-- Restore copies on return + calculate fine (1 PLN/day overdue)
CREATE OR REPLACE FUNCTION update_on_loan_return()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('Active', 'Overdue') AND NEW.status = 'Returned' THEN
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = NEW.book_id;

    IF NEW.return_date > OLD.due_date THEN
      NEW.fine := EXTRACT(DAY FROM (NEW.return_date - OLD.due_date))::DECIMAL;
    END IF;
    NEW.return_date := COALESCE(NEW.return_date, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_loans_before_update
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_on_loan_return();

-- Mark overdue loans
CREATE OR REPLACE FUNCTION mark_overdue_loans()
RETURNS void AS $$
  UPDATE loans
  SET status = 'Overdue'
  WHERE status = 'Active' AND due_date < NOW();
$$ LANGUAGE sql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');
CREATE POLICY "profiles_insert_trigger" ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- categories
CREATE POLICY "categories_select" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_modify" ON categories FOR ALL USING (get_user_role() = 'admin');

-- authors
CREATE POLICY "authors_select" ON authors FOR SELECT USING (TRUE);
CREATE POLICY "authors_modify" ON authors FOR ALL USING (get_user_role() = 'admin');

-- books
CREATE POLICY "books_select" ON books FOR SELECT
  USING (is_active = TRUE OR get_user_role() = 'admin');
CREATE POLICY "books_modify" ON books FOR ALL USING (get_user_role() = 'admin');

-- book_authors
CREATE POLICY "book_authors_select" ON book_authors FOR SELECT USING (TRUE);
CREATE POLICY "book_authors_modify" ON book_authors FOR ALL USING (get_user_role() = 'admin');

-- loans
CREATE POLICY "loans_select_own" ON loans FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "loans_insert_admin" ON loans FOR INSERT
  WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "loans_update_admin" ON loans FOR UPDATE
  USING (get_user_role() = 'admin');

-- reservations
CREATE POLICY "reservations_select_own" ON reservations FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "reservations_insert" ON reservations FOR INSERT
  WITH CHECK (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "reservations_update" ON reservations FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- =============================================
-- SAMPLE DATA
-- =============================================
INSERT INTO categories (category_name, description) VALUES
  ('Fiction', 'Novels, short stories and other fiction works'),
  ('Science', 'Books about science and technology'),
  ('History', 'Historical books and biographies'),
  ('Programming', 'Software development and computer science'),
  ('Philosophy', 'Philosophy, ethics and logic'),
  ('Children', 'Books for children and young adults');

INSERT INTO authors (first_name, last_name, nationality) VALUES
  ('George', 'Orwell', 'British'),
  ('J.K.', 'Rowling', 'British'),
  ('Robert', 'Martin', 'American'),
  ('Donald', 'Knuth', 'American'),
  ('Yuval Noah', 'Harari', 'Israeli'),
  ('Frank', 'Herbert', 'American');

INSERT INTO books (isbn, title, category_id, publisher, publication_year, total_copies, available_copies) VALUES
  ('978-0451524935', '1984', 1, 'Signet Classic', 1949, 5, 5),
  ('978-0439708180', 'Harry Potter and the Sorcerer''s Stone', 1, 'Scholastic', 1997, 4, 4),
  ('978-0132350884', 'Clean Code', 4, 'Prentice Hall', 2008, 3, 3),
  ('978-0201896831', 'The Art of Computer Programming', 4, 'Addison-Wesley', 1968, 2, 2),
  ('978-0062316097', 'Sapiens', 3, 'Harper', 2011, 4, 4),
  ('978-0441013593', 'Dune', 1, 'Ace Books', 1965, 3, 3);

INSERT INTO book_authors (book_id, author_id, author_order) VALUES
  (1, 1, 1),
  (2, 2, 1),
  (3, 3, 1),
  (4, 4, 1),
  (5, 5, 1),
  (6, 6, 1);
