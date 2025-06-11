import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Modal,
  Form,
  Alert,
  Carousel,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CourtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();

  const [court, setCourt] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [bookingPrice, setBookingPrice] = useState(0);

  const [bookingData, setBookingData] = useState({
    date: new Date(),
    startTime: "",
    endTime: "",
    notes: "",
  });

  const [availableTimes, setAvailableTimes] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: "",
  });

  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Fetch available times khi thay đổi ngày
  // Fetch available times when date changes
  const fetchAvailableTimes = async (selectedDate) => {
    try {
      setLoadingTimes(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await axios.get(
        `/api/courts/${id}/available-times?date=${dateStr}`
      );
      setBookedTimes(response.data.bookedTimes || []);
    } catch (error) {
      console.error("Error fetching available times:", error);
      setBookedTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const fetchCourtDetail = async () => {
    try {
      const response = await axios.get(`/api/courts/${id}`);
      setCourt(response.data);
    } catch (error) {
      console.error("Error fetching court detail:", error);
      toast.error("Không thể tải thông tin sân");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      console.log("Fetching reviews for court ID:", id);
      const response = await axios.get(`/api/reviews/courts/${id}/reviews`);
      console.log("Reviews response:", response.data);

      if (response.data.success) {
        setReviews(response.data.reviews || []);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    }
  };

  useEffect(() => {
    fetchCourtDetail();
    fetchReviews();
  }, [id]);

  // Tạo danh sách thời gian có thể chọn
  const generateAvailableTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const selectedDate = bookingData.date;
    const isToday = selectedDate.toDateString() === now.toDateString();

    // Parse court's openTime and closeTime (e.g., "06:00" and "22:00")
    const [openHour, openMinute] = court.openTime.split(":").map(Number);
    const [closeHour, closeMinute] = court.closeTime.split(":").map(Number);

    // Current time + 1 hour for today
    const minTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const minHour = isToday ? minTime.getHours() : 0;
    const minMinute = isToday ? minTime.getMinutes() : 0;
    const minTotalMinutes = minHour * 60 + minMinute;

    // Generate time slots in 30-minute increments
    for (let hour = openHour; hour <= closeHour; hour++) {
      const maxMinute = hour === closeHour ? closeMinute : 60;
      for (
        let minute = hour === openHour ? openMinute : 0;
        minute < maxMinute;
        minute += 30
      ) {
        const timeSlot = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;

        // Skip times before current time + 1 hour for today
        if (isToday) {
          const slotHour = hour;
          const slotMinute = minute;
          const slotTotalMinutes = slotHour * 60 + slotMinute;
          if (slotTotalMinutes <= minTotalMinutes) {
            continue;
          }
        }

        // Check if time slot is within a booked period
        let isBooked = false;
        for (const bookedTime of bookedTimes) {
          const [bookedHour, bookedMinute] = bookedTime.split(":").map(Number);
          const bookedTotalMinutes = bookedHour * 60 + bookedMinute;
          const slotTotalMinutes = hour * 60 + minute;
          if (slotTotalMinutes === bookedTotalMinutes) {
            isBooked = true;
            break;
          }
        }

        if (!isBooked) {
          slots.push(timeSlot);
        }
      }
    }

    return slots;
  };

  // Kiểm tra thời gian kết thúc hợp lệ
  const generateEndTimeSlots = () => {
    if (!bookingData.startTime) return [];

    const startTime = bookingData.startTime;
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;

    const [closeHour, closeMinute] = court.closeTime.split(":").map(Number);
    const slots = [];

    // Generate end times after startTime
    for (let hour = startHour; hour <= closeHour; hour++) {
      const maxMinute = hour === closeHour ? closeMinute : 60;
      for (
        let minute = hour === startHour ? startMinute + 30 : 0;
        minute < maxMinute;
        minute += 30
      ) {
        const timeSlot = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const endTotalMinutes = hour * 60 + minute;

        // Skip if end time is not after start time
        if (endTotalMinutes <= startTotalMinutes) continue;

        // Check for conflicts with booked times
        let hasConflict = false;
        for (
          let checkMinutes = startTotalMinutes + 30;
          checkMinutes <= endTotalMinutes;
          checkMinutes += 30
        ) {
          const checkHour = Math.floor(checkMinutes / 60);
          const checkMinute = checkMinutes % 60;
          const checkTimeSlot = `${checkHour
            .toString()
            .padStart(2, "0")}:${checkMinute.toString().padStart(2, "0")}`;

          if (bookedTimes.includes(checkTimeSlot)) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          slots.push(timeSlot);
        }
      }
    }

    return slots;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đặt sân");
      navigate("/login");
      return;
    }

    // Kiểm tra thời gian đặt sân
    const now = new Date();
    const selectedDate = bookingData.date;
    const isToday = selectedDate.toDateString() === now.toDateString();

    if (isToday) {
      const [startHour, startMinute] = bookingData.startTime
        .split(":")
        .map(Number);
      const bookingTime = new Date();
      bookingTime.setHours(startHour, startMinute, 0, 0);

      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      if (bookingTime <= oneHourFromNow) {
        toast.error(
          "Phải đặt sân trước ít nhất 1 tiếng so với thời gian hiện tại"
        );
        return;
      }
    }

    // Tính duration và giá
    const start = bookingData.startTime.split(":");
    const end = bookingData.endTime.split(":");
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    const duration = (endMinutes - startMinutes) / 60;

    if (duration <= 0) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

    const totalPrice = court.pricePerHour * duration;
    setBookingPrice(totalPrice);

    // Kiểm tra số dư ví
    if (user.walletBalance < totalPrice) {
      toast.error(
        `Số dư ví không đủ. Bạn cần ${totalPrice.toLocaleString(
          "vi-VN"
        )}đ nhưng chỉ có ${user.walletBalance.toLocaleString("vi-VN")}đ`
      );
      return;
    }

    // Hiển thị modal xác nhận
    setShowBookingModal(false);
    setShowConfirmModal(true);
  };

  const confirmBooking = async () => {
    setBookingLoading(true);
    try {
      const start = bookingData.startTime.split(":");
      const end = bookingData.endTime.split(":");
      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
      const duration = (endMinutes - startMinutes) / 60;

      await axios.post("/api/bookings", {
        courtId: id,
        date: bookingData.date.toISOString().split("T")[0],
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        duration,
        notes: bookingData.notes,
      });

      toast.success("Đặt sân thành công!");
      setShowConfirmModal(false);
      setBookingData({
        date: new Date(),
        startTime: "",
        endTime: "",
        notes: "",
      });

      // Cập nhật thông tin user (số dư ví)
      const userResponse = await axios.get("/api/auth/me");
      updateUser(userResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Đặt sân thất bại");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá");
      navigate("/login");
      return;
    }

    setReviewLoading(true);
    try {
      console.log("Submitting review:", { courtId: id, ...reviewData });

      const response = await axios.post("/api/reviews", {
        courtId: id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });

      console.log("Review response:", response.data);

      if (response.data.success) {
        toast.success("Đánh giá thành công!");
        setShowReviewModal(false);
        setReviewData({ rating: 5, comment: "" });
        fetchReviews(); // Reload reviews
        fetchCourtDetail(); // Reload court để cập nhật rating
      } else {
        toast.error(response.data.message || "Đánh giá thất bại");
      }
    } catch (error) {
      console.error("Review error:", error);
      toast.error(error.response?.data?.message || "Đánh giá thất bại");
    } finally {
      setReviewLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
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
        <Button variant="primary" onClick={() => navigate("/courts")}>
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
                    style={{ height: "400px", objectFit: "cover" }}
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
                <p>
                  <strong>Chủ sân:</strong> {court.owner?.name}
                </p>
                <p>
                  <strong>Điện thoại:</strong> {court.phone}
                </p>
                <p>
                  <strong>Email:</strong> {court.email}
                </p>
              </div>
            </Card.Body>
          </Card>

          {/* Reviews Section */}
          <Card className="mt-4">
            <Card.Header>
              <h5>Đánh giá từ khách hàng</h5>
            </Card.Header>
            <Card.Body>
              {reviews.length > 0 ? (
                <div>
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="border-bottom pb-3 mb-3 last:border-0"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{review.user?.name || "Ẩn danh"}</strong>
                          <div className="text-warning mb-1">
                            {"★".repeat(review.rating)}
                            {"☆".repeat(5 - review.rating)}
                          </div>
                          <p className="mb-1">{review.comment}</p>
                          <small className="text-muted">
                            {new Date(review.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4">
                  Chưa có đánh giá nào.
                </p>
              )}

              {isAuthenticated && (
                <div className="mt-3 pt-3 border-top">
                  <Button
                    variant="outline-primary"
                    onClick={() => setShowReviewModal(true)}
                  >
                    Viết đánh giá
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Booking Card */}
          <Card className="sticky-top" style={{ top: "100px" }}>
            <Card.Body>
              <div className="text-center mb-3">
                <h3 className="text-primary mb-1">
                  {court.pricePerHour?.toLocaleString("vi-VN")}đ
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
                        className={`fas fa-star ${
                          i < (court.averageRating || 0)
                            ? "text-warning"
                            : "text-muted"
                        }`}
                      ></i>
                    ))}
                  </div>
                  <small className="text-muted">
                    ({court.reviewCount || 0} đánh giá)
                  </small>
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
                    toast.error("Vui lòng đăng nhập để chat");
                    navigate("/login");
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
      <Modal
        show={showBookingModal}
        onHide={() => setShowBookingModal(false)}
        size="lg"
      >
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
                    onChange={(date) => {
                      setBookingData({
                        ...bookingData,
                        date,
                        startTime: "", // Reset thời gian khi đổi ngày
                        endTime: "",
                      });
                      fetchAvailableTimes(date);
                    }}
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
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        startTime: e.target.value,
                        endTime: "", // Reset endTime khi đổi startTime
                      })
                    }
                    required
                    disabled={loadingTimes}
                  >
                    <option value="">
                      {loadingTimes ? "Đang tải..." : "Chọn giờ"}
                    </option>
                    {generateAvailableTimeSlots().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Form.Select>
                  {bookedTimes.length > 0 && (
                    <Form.Text className="text-muted">
                      <small>Thời gian có dấu đỏ đã được đặt</small>
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ kết thúc</Form.Label>
                  <Form.Select
                    value={bookingData.endTime}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        endTime: e.target.value,
                      })
                    }
                    required
                    disabled={!bookingData.startTime}
                  >
                    <option value="">Chọn giờ</option>
                    {generateEndTimeSlots().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Hiển thị thông tin thời gian đã đặt */}
            {bookedTimes.length > 0 && (
              <div className="mb-3">
                <small className="text-muted">
                  <strong>Thời gian đã được đặt:</strong>{" "}
                  {bookedTimes.slice(0, 5).join(", ")}
                  {bookedTimes.length > 5 &&
                    ` và ${bookedTimes.length - 5} khung giờ khác`}
                </small>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={bookingData.notes}
                onChange={(e) =>
                  setBookingData({ ...bookingData, notes: e.target.value })
                }
                placeholder="Ghi chú thêm (tùy chọn)"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowBookingModal(false)}
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={bookingLoading}>
              {bookingLoading ? "Đang đặt..." : "Xác nhận đặt sân"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirm Booking Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận đặt sân</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h5>Thông tin đặt sân:</h5>
            <p>
              <strong>Sân:</strong> {court?.name}
            </p>
            <p>
              <strong>Ngày:</strong>{" "}
              {bookingData.date.toLocaleDateString("vi-VN")}
            </p>
            <p>
              <strong>Giờ:</strong> {bookingData.startTime} -{" "}
              {bookingData.endTime}
            </p>
            <p>
              <strong>Tổng tiền:</strong>{" "}
              <span className="text-primary fs-5">
                {bookingPrice.toLocaleString("vi-VN")}đ
              </span>
            </p>
            {bookingData.notes && (
              <p>
                <strong>Ghi chú:</strong> {bookingData.notes}
              </p>
            )}
          </div>
          <div className="alert alert-info">
            <p className="mb-2">
              <strong>Số dư ví hiện tại:</strong>{" "}
              {user?.walletBalance?.toLocaleString("vi-VN")}đ
            </p>
            <p className="mb-0">
              <strong>Số dư sau khi đặt:</strong>{" "}
              {(user?.walletBalance - bookingPrice).toLocaleString("vi-VN")}đ
            </p>
          </div>
          <div className="alert alert-warning">
            <small>
              • Tiền sẽ được trừ ngay khi đặt sân
              <br />
              • Có thể hủy đặt sân trước 2 tiếng để được hoàn tiền 100%
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={confirmBooking}
            disabled={bookingLoading}
          >
            {bookingLoading ? "Đang xử lý..." : "Xác nhận đặt sân"}
          </Button>
        </Modal.Footer>
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
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={`fas fa-star fa-2x me-1 ${
                      star <= reviewData.rating ? "text-warning" : "text-muted"
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setReviewData({ ...reviewData, rating: star })
                    }
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
                onChange={(e) =>
                  setReviewData({ ...reviewData, comment: e.target.value })
                }
                placeholder="Chia sẻ trải nghiệm của bạn..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowReviewModal(false)}
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={reviewLoading}>
              {reviewLoading ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CourtDetail;
