import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Alert, Carousel } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CourtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [court, setCourt] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const [bookingData, setBookingData] = useState({
    date: new Date(),
    startTime: '',
    endTime: '',
    notes: ''
  });
  
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchCourtDetail();
    fetchReviews();
  }, [id]);

  const fetchCourtDetail = async () => {
    try {
      const response = await axios.get(`/api/courts/${id}`);
      setCourt(response.data);
    } catch (error) {
      console.error('Error fetching court detail:', error);
      toast.error('Không thể tải thông tin sân');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`/api/reviews/court/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đặt sân');
      navigate('/login');
      return;
    }

    setBookingLoading(true);
    try {
      const response = await axios.post('/api/bookings', {
        court: id,
        date: bookingData.date.toISOString().split('T')[0],
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        notes: bookingData.notes
      });
      
      toast.success('Đặt sân thành công!');
      setShowBookingModal(false);
      setBookingData({
        date: new Date(),
        startTime: '',
        endTime: '',
        notes: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đặt sân thất bại');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đánh giá');
      navigate('/login');
      return;
    }

    setReviewLoading(true);
    try {
      const response = await axios.post('/api/reviews', {
        courtId: id,
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      
      toast.success('Đánh giá thành công!');
      setShowReviewModal(false);
      setReviewData({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đánh giá thất bại');
    } finally {
      setReviewLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  if (!court) {
    return (
      <Container className="py-5 text-center">
        <h4>Không tìm thấy sân</h4>
        <Button variant="primary" onClick={() => navigate('/courts')}>
          Quay lại danh sách sân
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row>
        <Col lg={8}>
          {/* Court Images */}
          {court.images && court.images.length > 0 && (
            <Carousel className="mb-4">
              {court.images.map((image, index) => (
                <Carousel.Item key={index}>
                  <img
                    className="d-block w-100"
                    src={image}
                    alt={`${court.name} ${index + 1}`}
                    style={{ height: '400px', objectFit: 'cover' }}
                  />
                </Carousel.Item>
              ))}
            </Carousel>
          )}
          
          {/* Court Info */}
          <Card className="mb-4">
            <Card.Body>
              <h1 className="mb-3">{court.name}</h1>
              <p className="text-muted mb-3">
                <i className="fas fa-map-marker-alt me-2"></i>
                {court.address}
              </p>
              
              <div className="mb-3">
                <h5>Mô tả</h5>
                <p>{court.description}</p>
              </div>
              
              <div className="mb-3">
                <h5>Tiện ích</h5>
                <div>
                  {court.amenities?.map((amenity, index) => (
                    <Badge key={index} bg="secondary" className="me-2 mb-2">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="mb-3">
                <h5>Thông tin liên hệ</h5>
                <p><strong>Chủ sân:</strong> {court.owner?.name}</p>
                <p><strong>Điện thoại:</strong> {court.phone}</p>
                <p><strong>Email:</strong> {court.email}</p>
              </div>
            </Card.Body>
          </Card>
          
          {/* Reviews */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Đánh giá ({reviews.length})</h5>
              {isAuthenticated && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                >
                  Viết đánh giá
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {reviews.length === 0 ? (
                <p className="text-muted">Chưa có đánh giá nào</p>
              ) : (
                reviews.map(review => (
                  <div key={review._id} className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{review.user?.name}</h6>
                        <div className="mb-2">
                          {[...Array(5)].map((_, i) => (
                            <i 
                              key={i} 
                              className={`fas fa-star ${i < review.rating ? 'text-warning' : 'text-muted'}`}
                            ></i>
                          ))}
                        </div>
                        <p className="mb-1">{review.comment}</p>
                        {review.ownerResponse && (
                          <div className="mt-2 p-2 bg-light rounded">
                            <small className="text-muted">Phản hồi từ chủ sân:</small>
                            <p className="mb-0 mt-1">{review.ownerResponse}</p>
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          {/* Booking Card */}
          <Card className="sticky-top" style={{ top: '100px' }}>
            <Card.Body>
              <div className="text-center mb-3">
                <h3 className="text-primary mb-1">
                  {court.pricePerHour?.toLocaleString('vi-VN')}đ
                </h3>
                <small className="text-muted">/ giờ</small>
              </div>
              
              <div className="mb-3">
                <small className="text-muted">
                  Giờ hoạt động: {court.openTime} - {court.closeTime}
                </small>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    {[...Array(5)].map((_, i) => (
                      <i 
                        key={i} 
                        className={`fas fa-star ${i < (court.averageRating || 0) ? 'text-warning' : 'text-muted'}`}
                      ></i>
                    ))}
                  </div>
                  <small className="text-muted">({court.reviewCount || 0} đánh giá)</small>
                </div>
              </div>
              
              <Button 
                variant="primary" 
                className="w-100 mb-2"
                onClick={() => setShowBookingModal(true)}
              >
                Đặt sân ngay
              </Button>
              
              <Button 
                variant="outline-primary" 
                className="w-100"
                onClick={() => {
                  if (isAuthenticated) {
                    // Navigate to chat with owner
                    navigate(`/chat?user=${court.owner._id}`);
                  } else {
                    toast.error('Vui lòng đăng nhập để chat');
                    navigate('/login');
                  }
                }}
              >
                <i className="fas fa-comments me-2"></i>
                Chat với chủ sân
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Booking Modal */}
      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Đặt sân {court.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleBooking}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ngày đặt</Form.Label>
                  <DatePicker
                    selected={bookingData.date}
                    onChange={(date) => setBookingData({...bookingData, date})}
                    minDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ bắt đầu</Form.Label>
                  <Form.Select
                    value={bookingData.startTime}
                    onChange={(e) => setBookingData({...bookingData, startTime: e.target.value})}
                    required
                  >
                    <option value="">Chọn giờ</option>
                    {generateTimeSlots().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ kết thúc</Form.Label>
                  <Form.Select
                    value={bookingData.endTime}
                    onChange={(e) => setBookingData({...bookingData, endTime: e.target.value})}
                    required
                  >
                    <option value="">Chọn giờ</option>
                    {generateTimeSlots().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={bookingData.notes}
                onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                placeholder="Ghi chú thêm (tùy chọn)"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBookingModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={bookingLoading}>
              {bookingLoading ? 'Đang đặt...' : 'Xác nhận đặt sân'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Đánh giá sân</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReview}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Đánh giá</Form.Label>
              <div>
                {[1, 2, 3, 4, 5].map(star => (
                  <i
                    key={star}
                    className={`fas fa-star fa-2x me-1 ${star <= reviewData.rating ? 'text-warning' : 'text-muted'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setReviewData({...reviewData, rating: star})}
                  ></i>
                ))}
              </div>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Nhận xét</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={reviewData.comment}
                onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={reviewLoading}>
              {reviewLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CourtDetail;