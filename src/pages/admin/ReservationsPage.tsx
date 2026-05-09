import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Typography, App, Popconfirm, Select, Input } from 'antd';
import { CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Reservation } from '../../types';

const statusColor: Record<string, string> = {
  Active: 'blue',
  Fulfilled: 'green',
  Cancelled: 'default',
  Expired: 'orange',
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { message } = App.useApp();

  async function load() {
    setLoading(true);
    // Expire old reservations
    await supabase.from('reservations')
      .update({ status: 'Expired' })
      .eq('status', 'Active')
      .lt('expiration_date', new Date().toISOString());

    const { data } = await supabase.from('reservations')
      .select('*, books(title), profiles(first_name, last_name, email)')
      .order('reservation_date', { ascending: false });
    setReservations((data as Reservation[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(r: Reservation, status: string) {
    const { error } = await supabase.from('reservations').update({ status }).eq('reservation_id', r.reservation_id);
    if (error) message.error(error.message);
    else { message.success(`Reservation ${status.toLowerCase()}`); load(); }
  }

  const filtered = reservations
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r =>
      (r.books?.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      `${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
    );

  const columns = [
    { title: 'Book', key: 'book', render: (_: unknown, r: Reservation) => r.books?.title, ellipsis: true },
    { title: 'User', key: 'user', render: (_: unknown, r: Reservation) => `${r.profiles?.first_name} ${r.profiles?.last_name}` },
    { title: 'Reserved', dataIndex: 'reservation_date', key: 'res_date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Expires', dataIndex: 'expiration_date', key: 'exp_date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Reservation) =>
        r.status === 'Active' ? (
          <Space>
            <Popconfirm title="Mark as fulfilled?" onConfirm={() => updateStatus(r, 'Fulfilled')}>
              <Button icon={<CheckOutlined />} size="small" type="primary">Fulfill</Button>
            </Popconfirm>
            <Popconfirm title="Cancel reservation?" onConfirm={() => updateStatus(r, 'Cancelled')}>
              <Button icon={<CloseOutlined />} size="small" danger>Cancel</Button>
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Reservations</Typography.Title>
        <Space>
        <Input
          placeholder="Search book or user..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Fulfilled', label: 'Fulfilled' },
            { value: 'Cancelled', label: 'Cancelled' },
            { value: 'Expired', label: 'Expired' },
          ]}
        />
        </Space>
      </div>

      <Table dataSource={filtered} columns={columns} rowKey="reservation_id" loading={loading} />
    </div>
  );
}
