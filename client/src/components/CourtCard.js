import React from "react";
import { Card, Badge, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./CourtCard.css";

const CourtCard = ({ court }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/courts/${court._id}`);
  };

  const locationString =
    [court.address, court.district, court.city].filter(Boolean).join(", ") ||
    "Địa chỉ không có";

  return (
    <Card className="court-card h-100">
      <div className="court-image-container">
        <Card.Img
          variant="top"
          src={
            court.images?.[0] ||
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
          }
          className="court-image"
        />
        {court.isPosted && (
          <Badge bg="warning" className="featured-badge">
            <i className="fas fa-star me-1"></i>
            Nổi bật
          </Badge>
        )}
        <div className="image-overlay">
          <Button
            variant="light"
            size="sm"
            className="quick-view-btn"
            onClick={handleViewDetails}
          >
            <i className="fas fa-eye me-1"></i>
            Xem nhanh
          </Button>
        </div>
      </div>

      <Card.Body className="d-flex flex-column court-body">
        <div className="court-header">
          <Card.Title className="court-name">{court.name}</Card.Title>
          <div className="court-rating">
            <i className="fas fa-star text-warning"></i>
            <span className="rating-value">
              {court.averageRating ? court.averageRating.toFixed(1) : "Mới"}
            </span>
            <span className="rating-count">({court.totalReviews || 0})</span>
          </div>
        </div>

        <div className="court-location">
          <i className="fas fa-map-marker-alt text-muted me-1"></i>
          <span className="location-text">{locationString}</span>
        </div>

        <div className="court-amenities">
          {court.amenities?.slice(0, 3).map((amenity, index) => (
            <Badge key={index} bg="light" text="dark" className="amenity-badge">
              {amenity}
            </Badge>
          ))}
          {court.amenities?.length > 3 && (
            <Badge bg="secondary" className="amenity-badge">
              +{court.amenities.length - 3}
            </Badge>
          )}
        </div>

        <div className="court-footer mt-auto">
          <div className="price-section">
            <span className="price-label">Giá từ</span>
            <span className="price-value">
              {court.pricePerHour?.toLocaleString("vi-VN")}đ
            </span>
            <span className="price-unit">/giờ</span>
          </div>

          <Button
            variant="primary"
            className="book-btn"
            onClick={handleViewDetails}
          >
            <i className="fas fa-calendar-plus me-1"></i>
            Đặt ngay
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CourtCard;
