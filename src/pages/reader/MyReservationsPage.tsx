import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, App, Popconfirm, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Reservation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const statusColor: Record<string, string> = {
  Active: 'blue',
  Fulfilled: 'green',
  Cancelled: 'default',
  Expired: 'orange',
};

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { message } = App.useApp();

  async function load() {
    if (!profile) return;
    const { data } = await supabase
      .from('reservations')
      .select('*, books(title)')
      .eq('user_id', profile.id)
      .order('reservation_date', { ascending: false });
    setReservations((data as Reservation[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function handleCancel(r: Reservation) {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'Cancelled' })
      .eq('reservation_id', r.reservation_id);
    if (error) message.error(error.message);
    else { message.success('Reservation cancelled'); load(); }
  }

  if (loading) return <Spin />;

  const columns = [
    {
      title: 'Book',
      key: 'book',
      render: (_: unknown, r: Reservation) => <Typography.Text strong>{r.books?.title}</Typography.Text>,
      ellipsis: true,
    },
    { title: 'Reserved On', dataIndex: 'reservation_date', key: 'res_date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
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
          <Popconfirm title="Cancel this reservation?" onConfirm={() => handleCancel(r)}>
            <Button icon={<CloseOutlined />} size="small" danger>Cancel</Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>My Reservations</Typography.Title>
      <Table dataSource={reservations} columns={columns} rowKey="reservation_id" pagination={{ pageSize: 10 }} />
    </div>
  );
}
