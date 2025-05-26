import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    skillLevel: '',
    bio: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        skillLevel: user.skillLevel || '',
        bio: user.bio || '',
        location: user.location || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.put('/api/users/profile', formData);
      updateUser(response.data.user);
      toast.success('Cập nhật hồ sơ thành công!');
    } catch (error) {
      const message = error.response?.data?.message || 'Lỗi khi cập nhật hồ sơ';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getSkillLevelText = (level) => {
    const levels = {
      beginner: 'Mới bắt đầu',
      intermediate: 'Trung bình',
      advanced: 'Nâng cao',
      professional: 'Chuyên nghiệp'
    };
    return levels[level] || level;
  };

  const getRoleText = (role) => {
    const roles = {
      player: 'Người chơi',
      owner: 'Chủ sân',
      admin: 'Quản trị viên'
    };
    return roles[role] || role;
  };

  return (
    <Container className="py-4">
      <Row>
        <Col md={8} className="mx-auto">
          <Card>
            <Card.Header>
              <h3 className="mb-0">Hồ sơ cá nhân</h3>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Họ và tên</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Số điện thoại</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Email không thể thay đổi
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vai trò</Form.Label>
                      <Form.Control
                        type="text"
                        value={getRoleText(user?.role)}
                        disabled
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                {user?.role === 'player' && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Trình độ</Form.Label>
                        <Form.Select
                          name="skillLevel"
                          value={formData.skillLevel}
                          onChange={handleChange}
                        >
                          <option value="beginner">Mới bắt đầu</option>
                          <option value="intermediate">Trung bình</option>
                          <option value="advanced">Nâng cao</option>
                          <option value="professional">Chuyên nghiệp</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Địa điểm</Form.Label>
                        <Form.Control
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Thành phố/Quận/Huyện"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Label>Giới thiệu bản thân</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                  />
                </Form.Group>
                
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    {user?.role === 'owner' && (
                      <span className={`badge ${user?.isApproved ? 'bg-success' : 'bg-warning'}`}>
                        {user?.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật hồ sơ'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;