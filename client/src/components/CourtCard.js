import React from "react";
import { Card, Badge, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const CourtCard = ({ court }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/courts/${court._id}`);
  };

  // Tạo chuỗi địa điểm đầy đủ
  const locationString =
    [court.address, court.district, court.city].filter(Boolean).join(", ") ||
    "Địa chỉ không có";

  return (
    <Card className="h-100 shadow-sm" style={{ border: "1px solid #ddd" }}>
      <Card.Img
        variant="top"
        src={
          court.images?.[0] || "https://via.placeholder.com/200x200?text=Court"
        }
        style={{ height: "200px", objectFit: "cover" }}
      />
      <Card.Body className="d-flex flex-column">
        <Card.Title className="h5">
          {court.name || "Tên sân không có"}
        </Card.Title>
        <Card.Text className="text-muted small mb-2">
          <i className="fas fa-map-marker-alt me-1"></i>
          {locationString}
        </Card.Text>

        <div className="mb-2">
          {court.amenities?.length > 0 ? (
            court.amenities.slice(0, 3).map((amenity, index) => (
              <Badge key={index} bg="secondary" className="me-1 mb-1">
                {amenity}
              </Badge>
            ))
          ) : (
            <Badge bg="light" text="dark">
              Không có tiện ích
            </Badge>
          )}
          {court.amenities?.length > 3 && (
            <Badge bg="light" text="dark">
              +{court.amenities.length - 3}
            </Badge>
          )}
        </div>

        <div className="mb-2">
          <strong className="text-primary">
            {court.pricePerHour
              ? `${court.pricePerHour.toLocaleString("vi-VN")}đ/giờ`
              : "Giá không có"}
          </strong>
        </div>

        <div className="mb-2">
          <small className="text-muted">
            Giờ mở cửa: {court.openTime || "N/A"} - {court.closeTime || "N/A"}
          </small>
        </div>

        <div className="mt-auto">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              {[...Array(5)].map((_, i) => (
                <i
                  key={i}
                  className={`fas fa-star ${
                    i < (court.rating || 0) ? "text-warning" : "text-muted"
                  }`}
                ></i>
              ))}
              <small className="text-muted ms-1">
                ({court.totalReviews || 0})
              </small>
            </div>
            <Button variant="primary" size="sm" onClick={handleViewDetails}>
              Xem chi tiết
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CourtCard;
