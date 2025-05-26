import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Badge, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    skillLevel: '',
    location: ''
  });
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'find_partner',
    skillLevel: 'beginner',
    location: '',
    preferredTime: '',
    maxPlayers: 2
  });
  
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await axios.get(`/api/posts?${params}`);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Lỗi khi tải bài đăng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/posts', newPost);
      toast.success('Tạo bài đăng thành công!');
      setShowModal(false);
      setNewPost({
        title: '',
        content: '',
        type: 'find_partner',
        skillLevel: 'beginner',
        location: '',
        preferredTime: '',
        maxPlayers: 2
      });
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo bài đăng');
    }
  };

  const handleJoinPost = async (postId) => {
    try {
      await axios.post(`/api/posts/${postId}/join`);
      toast.success('Tham gia thành công!');
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tham gia');
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

  const getTypeText = (type) => {
    const types = {
      find_partner: 'Tìm đối thủ',
      promotion: 'Khuyến mãi'
    };
    return types[type] || type;
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Tìm đối thủ & Khuyến mãi</h2>
            {isAuthenticated && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <i className="fas fa-plus me-2"></i>
                Tạo bài đăng
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="">Tất cả loại</option>
            <option value="find_partner">Tìm đối thủ</option>
            <option value="promotion">Khuyến mãi</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.skillLevel}
            onChange={(e) => setFilters({...filters, skillLevel: e.target.value})}
          >
            <option value="">Tất cả trình độ</option>
            <option value="beginner">Mới bắt đầu</option>
            <option value="intermediate">Trung bình</option>
            <option value="advanced">Nâng cao</option>
            <option value="professional">Chuyên nghiệp</option>
          </Form.Select>
        </Col>
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Tìm theo địa điểm..."
            value={filters.location}
            onChange={(e) => setFilters({...filters, location: e.target.value})}
          />
        </Col>
      </Row>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <Row>
          {posts.length === 0 ? (
            <Col>
              <Alert variant="info" className="text-center">
                Không có bài đăng nào phù hợp với bộ lọc của bạn.
              </Alert>
            </Col>
          ) : (
            posts.map((post) => (
              <Col md={6} lg={4} className="mb-4" key={post._id}>
                <Card className="h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge bg={post.type === 'find_partner' ? 'primary' : 'success'}>
                        {getTypeText(post.type)}
                      </Badge>
                      <small className="text-muted">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </small>
                    </div>
                    
                    <Card.Title className="h5">{post.title}</Card.Title>
                    <Card.Text>{post.content}</Card.Text>
                    
                    <div className="mb-2">
                      <small className="text-muted d-block">
                        <i className="fas fa-user me-1"></i>
                        {post.author?.name}
                      </small>
                      {post.location && (
                        <small className="text-muted d-block">
                          <i className="fas fa-map-marker-alt me-1"></i>
                          {post.location}
                        </small>
                      )}
                      {post.skillLevel && (
                        <small className="text-muted d-block">
                          <i className="fas fa-star me-1"></i>
                          {getSkillLevelText(post.skillLevel)}
                        </small>
                      )}
                      {post.preferredTime && (
                        <small className="text-muted d-block">
                          <i className="fas fa-clock me-1"></i>
                          {post.preferredTime}
                        </small>
                      )}
                    </div>
                    
                    {post.type === 'find_partner' && (
                      <div className="mb-2">
                        <small className="text-muted">
                          Người tham gia: {post.joinedPlayers?.length || 0}/{post.maxPlayers}
                        </small>
                      </div>
                    )}
                    
                    {isAuthenticated && post.author?._id !== user?._id && (
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleJoinPost(post._id)}
                        disabled={post.joinedPlayers?.length >= post.maxPlayers}
                      >
                        {post.type === 'find_partner' ? 'Tham gia' : 'Xem chi tiết'}
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>
      )}

      {/* Create Post Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Tạo bài đăng mới</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreatePost}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tiêu đề</Form.Label>
                  <Form.Control
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Loại bài đăng</Form.Label>
                  <Form.Select
                    value={newPost.type}
                    onChange={(e) => setNewPost({...newPost, type: e.target.value})}
                  >
                    <option value="find_partner">Tìm đối thủ</option>
                    <option value="promotion">Khuyến mãi</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Nội dung</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                required
              />
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Địa điểm</Form.Label>
                  <Form.Control
                    type="text"
                    value={newPost.location}
                    onChange={(e) => setNewPost({...newPost, location: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Thời gian mong muốn</Form.Label>
                  <Form.Control
                    type="text"
                    value={newPost.preferredTime}
                    onChange={(e) => setNewPost({...newPost, preferredTime: e.target.value})}
                    placeholder="VD: Thứ 7, 8:00 AM"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {newPost.type === 'find_partner' && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Trình độ</Form.Label>
                    <Form.Select
                      value={newPost.skillLevel}
                      onChange={(e) => setNewPost({...newPost, skillLevel: e.target.value})}
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
                    <Form.Label>Số người tối đa</Form.Label>
                    <Form.Control
                      type="number"
                      min="2"
                      max="10"
                      value={newPost.maxPlayers}
                      onChange={(e) => setNewPost({...newPost, maxPlayers: parseInt(e.target.value)})}
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Tạo bài đăng
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Posts;