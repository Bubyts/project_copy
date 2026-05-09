import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined, PhoneOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  async function onFinish(values: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone ?? '',
        },
      },
    });
    setLoading(false);

    if (error) {
      message.error(error.message);
      return;
    }

    message.success('Account created! Please sign in.');
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 440, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <BookOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Typography.Title level={3} style={{ margin: '12px 0 4px' }}>Create Account</Typography.Title>
          <Typography.Text type="secondary">Join LibraryDB as a reader</Typography.Text>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} placeholder="John" />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input placeholder="Doe" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder="john@example.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone (optional)">
            <Input prefix={<PhoneOutlined />} placeholder="+48 123 456 789" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Minimum 6 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item name="confirm" label="Confirm Password" dependencies={['password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Typography.Text style={{ display: 'block', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </Typography.Text>
      </Card>
    </div>
  );
}
