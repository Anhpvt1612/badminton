import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Modal,
  Form,
  Badge,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const MyCourts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Địa phương
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    district: "",
    city: "",
    pricePerHour: "",
    openTime: "06:00",
    closeTime: "22:00",
    amenities: [],
    images: [],
  });

  const amenitiesList = [
    { value: "parking", label: "Bãi đỗ xe" },
    { value: "lighting", label: "Đèn chiếu sáng" },
    { value: "restroom", label: "Phòng vệ sinh" },
    { value: "shower", label: "Phòng tắm" },
    { value: "equipment_rental", label: "Cho thuê dụng cụ" },
    { value: "cafe", label: "Quán cafe" },
    { value: "air_conditioning", label: "Điều hòa" },
    { value: "wifi", label: "WiFi miễn phí" },
    { value: "security", label: "Bảo vệ 24/7" },
    { value: "firstAid", label: "Y tế" },
    { value: "lockers", label: "Tủ khóa" },
  ];

  // Data tĩnh cho provinces và districts
  const staticProvinces = [
    { code: 79, name: "TP Hồ Chí Minh" },
    { code: 1, name: "Hà Nội" },
    { code: 48, name: "Đà Nẵng" },
  ];

  const staticDistricts = {
    79: [
      // TP HCM
      { code: 760, name: "Quận 1" },
      { code: 769, name: "Quận 2" },
      { code: 770, name: "Quận 3" },
      { code: 771, name: "Quận 4" },
      { code: 772, name: "Quận 5" },
      { code: 773, name: "Quận 6" },
      { code: 774, name: "Quận 7" },
      { code: 775, name: "Quận 8" },
      { code: 776, name: "Quận 9" },
      { code: 777, name: "Quận 10" },
      { code: 778, name: "Quận 11" },
      { code: 779, name: "Quận 12" },
      { code: 783, name: "Quận Bình Thạnh" },
      { code: 784, name: "Quận Gò Vấp" },
      { code: 785, name: "Quận Phú Nhuận" },
      { code: 786, name: "Quận Tân Bình" },
      { code: 787, name: "Quận Tân Phú" },
      { code: 788, name: "Quận Thủ Đức" },
      { code: 794, name: "Huyện Bình Chánh" },
      { code: 795, name: "Huyện Cần Giờ" },
      { code: 796, name: "Huyện Củ Chi" },
      { code: 797, name: "Huyện Hóc Môn" },
      { code: 798, name: "Huyện Nhà Bè" },
    ],
    1: [
      // Hà Nội
      { code: 1, name: "Quận Ba Đình" },
      { code: 2, name: "Quận Hoàn Kiếm" },
      { code: 3, name: "Quận Hai Bà Trưng" },
      { code: 4, name: "Quận Đống Đa" },
      { code: 5, name: "Quận Tây Hồ" },
      { code: 6, name: "Quận Cầu Giấy" },
      { code: 7, name: "Quận Thanh Xuân" },
      { code: 8, name: "Quận Hoàng Mai" },
      { code: 9, name: "Quận Long Biên" },
      { code: 16, name: "Quận Nam Từ Liêm" },
      { code: 17, name: "Quận Bắc Từ Liêm" },
      { code: 18, name: "Quận Hà Đông" },
    ],
    48: [
      // Đà Nẵng
      { code: 490, name: "Quận Hải Châu" },
      { code: 491, name: "Quận Cẩm Lệ" },
      { code: 492, name: "Quận Thanh Khê" },
      { code: 493, name: "Quận Liên Chiểu" },
      { code: 494, name: "Quận Ngũ Hành Sơn" },
      { code: 495, name: "Quận Sơn Trà" },
      { code: 497, name: "Huyện Hòa Vang" },
      { code: 498, name: "Huyện Hoàng Sa" },
    ],
  };

  useEffect(() => {
    fetchMyCourts();
    fetchProvinces();
  }, []);

  // Fetch provinces from API với fallback
  const fetchProvinces = async () => {
    try {
      setLoadingLocation(true);
      setProvinces(staticProvinces);
    } catch (error) {}
  };

  // Fetch districts with fallback
  const fetchDistricts = async (provinceCode) => {
    try {
      setLoadingLocation(true);

      const staticDistrictList = staticDistricts[provinceCode] || [];
      setDistricts(staticDistrictList);

      if (staticDistrictList.length === 0) {
        toast.warning(
          "Không có dữ liệu quận/huyện cho tỉnh này. Vui lòng nhập thủ công."
        );
      }
    } catch (error) {
    } finally {
      setLoadingLocation(false);
    }
  };

  const fetchMyCourts = async () => {
    try {
      const response = await axios.get("/api/courts/my-courts");
      setCourts(response.data || []);
    } catch (error) {
      console.error("Error fetching courts:", error);
      if (error.response?.status === 401) {
        toast.error("Vui lòng đăng nhập lại");
        navigate("/login");
        return;
      }
      toast.error("Không thể tải danh sách sân");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    const formDataImg = new FormData();

    files.forEach((file) => {
      formDataImg.append("images", file);
    });

    try {
      const response = await axios.post(
        "/api/upload/court-images",
        formDataImg,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...response.data.urls],
      }));
      toast.success(`Tải lên ${files.length} ảnh thành công!`);
    } catch (error) {
      toast.error("Lỗi tải ảnh lên");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleCreateCourt = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const selectedProvince = provinces.find(
        (p) => p.code === parseInt(formData.city)
      );
      const selectedDistrict = districts.find(
        (d) => d.code === parseInt(formData.district)
      );

      const courtData = {
        ...formData,
        city: selectedProvince?.name || formData.city,
        district: selectedDistrict?.name || formData.district,
        pricePerHour: parseInt(formData.pricePerHour),
      };

      await axios.post("/api/courts", courtData);
      toast.success("Tạo sân thành công! Chờ admin duyệt.");
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        address: "",
        district: "",
        city: "",
        pricePerHour: "",
        openTime: "06:00",
        closeTime: "22:00",
        amenities: [],
        images: [],
      });
      fetchMyCourts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi tạo sân");
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Nếu thay đổi thành phố, fetch quận huyện
    if (name === "city" && value) {
      const numericValue = parseInt(value);
      fetchDistricts(numericValue);
      setFormData((prev) => ({
        ...prev,
        district: "", // Reset district
      }));
    }
  };

  const handleAmenityChange = (amenityValue) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityValue)
        ? prev.amenities.filter((a) => a !== amenityValue)
        : [...prev.amenities, amenityValue],
    }));
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h2>Sân của tôi</h2>
          <p className="text-muted">Quản lý và theo dõi các sân bạn đã tạo</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus me-2"></i>
            Tạo sân mới
          </Button>
        </Col>
      </Row>

      {courts.length === 0 ? (
        <Alert variant="info" className="text-center">
          <h5>Chưa có sân nào</h5>
          <p>Hãy tạo sân đầu tiên để bắt đầu kinh doanh!</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus me-2"></i>
            Tạo sân ngay
          </Button>
        </Alert>
      ) : (
        <Row>
          {courts.map((court) => (
            <Col md={6} lg={4} key={court._id} className="mb-4">
              <Card className="h-100">
                {court.images && court.images[0] && (
                  <Card.Img
                    variant="top"
                    src={court.images[0]}
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                )}
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="d-flex justify-content-between align-items-start">
                    <span>{court.name}</span>
                    {court.isPosted && (
                      <Badge bg="success">
                        <i className="fas fa-star me-1"></i>
                        Nổi bật
                      </Badge>
                    )}
                  </Card.Title>

                  <Card.Text className="text-muted">
                    {court.address}, {court.district}, {court.city}
                  </Card.Text>

                  <Card.Text>
                    <strong className="text-success">
                      {court.pricePerHour?.toLocaleString("vi-VN")}đ/giờ
                    </strong>
                  </Card.Text>

                  <div className="mb-3">
                    <Badge
                      bg={court.isApproved ? "success" : "warning"}
                      className="me-2"
                    >
                      {court.isApproved ? "Đã duyệt" : "Chờ duyệt"}
                    </Badge>
                    <Badge
                      bg={court.status === "active" ? "success" : "secondary"}
                    >
                      {court.status === "active" ? "Hoạt động" : court.status}
                    </Badge>
                  </div>

                  <div className="mt-auto d-grid gap-2">
                    <Button
                      variant="outline-primary"
                      onClick={() => navigate(`/courts/${court._id}`)}
                    >
                      <i className="fas fa-eye me-1"></i>
                      Xem chi tiết
                    </Button>
                    {/* SỬA: Link đến thống kê từng sân */}
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => navigate(`/courts/${court._id}/stats`)}
                    >
                      <i className="fas fa-chart-line me-1"></i>
                      Thống kê sân này
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modal tạo sân mới */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Tạo sân mới</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateCourt}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên sân *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="VD: Sân cầu lông ABC"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Giá thuê (đ/giờ) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="pricePerHour"
                    value={formData.pricePerHour}
                    onChange={handleInputChange}
                    placeholder="100000"
                    min="10000"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Mô tả sân *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Mô tả về sân, chất lượng, vị trí..."
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Thành phố *</Form.Label>
                  <Form.Select
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn thành phố</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </Form.Select>
                  {provinces.length <= 10 && (
                    <Form.Text className="text-muted">
                      <small>
                        ⚠️ Đang sử dụng danh sách cơ bản do API bị lỗi
                      </small>
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Quận/Huyện *</Form.Label>
                  <Form.Select
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    disabled={!formData.city || loadingLocation}
                    required
                  >
                    <option value="">
                      {loadingLocation ? "Đang tải..." : "Chọn quận/huyện"}
                    </option>
                    {districts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </Form.Select>
                  {!formData.city && (
                    <Form.Text className="text-muted">
                      <small>Chọn thành phố trước</small>
                    </Form.Text>
                  )}
                  {formData.city &&
                    districts.length === 0 &&
                    !loadingLocation && (
                      <Form.Text className="text-warning">
                        <small>
                          ⚠️ Không có dữ liệu quận/huyện. Nhập thủ công vào địa
                          chỉ chi tiết.
                        </small>
                      </Form.Text>
                    )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Địa chỉ chi tiết *</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Số nhà, tên đường, quận/huyện (nếu chưa chọn được ở trên)..."
                required
              />
              <Form.Text className="text-muted">
                <small>
                  Nếu không tìm được quận/huyện ở trên, hãy ghi đầy đủ vào đây
                </small>
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ mở cửa</Form.Label>
                  <Form.Control
                    type="time"
                    name="openTime"
                    value={formData.openTime}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Giờ đóng cửa</Form.Label>
                  <Form.Control
                    type="time"
                    name="closeTime"
                    value={formData.closeTime}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Tiện nghi</Form.Label>
              <Row>
                {amenitiesList.map((amenity) => (
                  <Col md={6} key={amenity.value}>
                    <Form.Check
                      type="checkbox"
                      id={amenity.value}
                      label={amenity.label}
                      checked={formData.amenities.includes(amenity.value)}
                      onChange={() => handleAmenityChange(amenity.value)}
                    />
                  </Col>
                ))}
              </Row>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Hình ảnh sân (tối đa 5 ảnh)</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImages}
              />
              {uploadingImages && (
                <Form.Text className="text-muted">
                  Đang tải ảnh lên...
                </Form.Text>
              )}

              {formData.images.length > 0 && (
                <div className="mt-2">
                  <Row>
                    {formData.images.map((url, index) => (
                      <Col xs={6} md={3} key={index} className="mb-2">
                        <div className="position-relative">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="img-fluid rounded"
                            style={{
                              height: "100px",
                              objectFit: "cover",
                              width: "100%",
                            }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0"
                            onClick={() => removeImage(index)}
                          >
                            ×
                          </Button>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={creating || uploadingImages}
            >
              {creating ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <i className="fas fa-plus me-2"></i>
                  Tạo sân
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default MyCourts;
