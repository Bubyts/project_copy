import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Divider, Tag, App } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  if (!profile) return null;

  async function onFinish(values: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
  }) {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', profile!.id);
    setSaving(false);

    if (error) {
      message.error(error.message);
      return;
    }

    await refreshProfile();
    message.success('Profile updated');
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>My Profile</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1677ff22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserOutlined style={{ fontSize: 28, color: '#1677ff' }} />
          </div>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {profile.first_name} {profile.last_name}
            </Typography.Title>
            <Typography.Text type="secondary">{profile.email}</Typography.Text>
            <div style={{ marginTop: 4 }}>
              <Tag color={profile.role === 'admin' ? 'gold' : 'blue'}>
                {profile.role.toUpperCase()}
              </Tag>
              <Tag color={profile.is_active ? 'green' : 'red'}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </div>
          </div>
        </div>

        <Divider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <MailOutlined style={{ color: '#8c8c8c' }} />
            <Typography.Text>{profile.email}</Typography.Text>
          </div>
          {profile.phone && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <PhoneOutlined style={{ color: '#8c8c8c' }} />
              <Typography.Text>{profile.phone}</Typography.Text>
            </div>
          )}
          {profile.address && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <HomeOutlined style={{ color: '#8c8c8c' }} />
              <Typography.Text>{profile.address}</Typography.Text>
            </div>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Max loans allowed: {profile.max_loans_allowed}
          </Typography.Text>
        </div>
      </Card>

      <Card title="Edit Profile">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone ?? '',
            address: profile.address ?? '',
          }}
          onFinish={onFinish}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="phone" label="Phone">
            <Input prefix={<PhoneOutlined />} placeholder="+48 123 456 789" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input prefix={<HomeOutlined />} placeholder="Street, City" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
