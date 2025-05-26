import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/users/bookings');
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Lỗi khi tải lịch đặt sân');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      await axios.put(`/api/bookings/${selectedBooking._id}/cancel`);
      toast.success('Hủy đặt sân thành công!');
      setShowCancelModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi hủy đặt sân');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'warning', text: 'Chờ xác nhận' },
      confirmed: { bg: 'success', text: 'Đã xác nhận' },
      cancelled: { bg: 'danger', text: 'Đã hủy' },
      completed: { bg: 'info', text: 'Hoàn thành' }
    };
    const config = statusConfig[status] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const canCancelBooking = (booking) => {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false;
    }
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const timeDiff = bookingDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff > 2; // Có thể hủy nếu còn hơn 2 giờ
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Lịch đặt sân của tôi</h2>
        </Col>
      </Row>

      {bookings.length === 0 ? (
        <Alert variant="info" className="text-center">
          Bạn chưa có lịch đặt sân nào.
        </Alert>
      ) : (
        <Row>
          {bookings.map((booking) => (
            <Col md={6} lg={4} className="mb-4" key={booking._id}>
              <Card className="h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title">{booking.court?.name}</h5>
                    {getStatusBadge(booking.status)}
                  </div>
                  
                  <Card.Text className="text-muted mb-2">
                    <i className="fas fa-map-marker-alt me-1"></i>
                    {booking.court?.address}
                  </Card.Text>
                  
                  <Card.Text>
                    <strong>Ngày:</strong> {new Date(booking.date).toLocaleDateString('vi-VN')}<br/>
                    <strong>Giờ:</strong> {booking.startTime} - {booking.endTime}<br/>
                    <strong>Tổng tiền:</strong> {booking.totalPrice?.toLocaleString('vi-VN')}đ
                  </Card.Text>
                  
                  {booking.notes && (
                    <Card.Text>
                      <strong>Ghi chú:</strong> {booking.notes}
                    </Card.Text>
                  )}
                  
                  <div className="mt-auto">
                    {canCancelBooking(booking) && (
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowCancelModal(true);
                        }}
                      >
                        Hủy đặt sân
                      </Button>
                    )}
                  </div>
                </Card.Body>
                <Card.Footer className="text-muted">
                  <small>
                    Đặt lúc: {new Date(booking.createdAt).toLocaleString('vi-VN')}
                  </small>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Cancel Booking Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận hủy đặt sân</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bạn có chắc chắn muốn hủy đặt sân này không?</p>
          {selectedBooking && (
            <div className="bg-light p-3 rounded">
              <strong>{selectedBooking.court?.name}</strong><br/>
              Ngày: {new Date(selectedBooking.date).toLocaleDateString('vi-VN')}<br/>
              Giờ: {selectedBooking.startTime} - {selectedBooking.endTime}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            Không
          </Button>
          <Button variant="danger" onClick={handleCancelBooking}>
            Có, hủy đặt sân
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyBookings;