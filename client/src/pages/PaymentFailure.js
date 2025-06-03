import React from "react";
import { useNavigate } from "react-router-dom";

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center mt-5">
      <h2>Thanh toán thất bại!</h2>
      <p>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
      <button className="btn btn-primary" onClick={() => navigate("/")}>
        Về trang chủ
      </button>
    </div>
  );
};

export default PaymentFailure;
