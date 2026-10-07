-- MVP-3 bổ sung: quản lý giá & tồn kho cơ bản cho danh mục vị thuốc
-- (phục vụ bảng Danh mục vị thuốc: đơn giá, tồn kho, cảnh báo sắp hết)

ALTER TABLE herbs
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(12,0),        -- Đơn giá theo base_unit (VNĐ)
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(12,2) DEFAULT 0 NOT NULL,  -- Tồn kho (theo base_unit)
  ADD COLUMN IF NOT EXISTS min_stock_quantity NUMERIC(12,2) DEFAULT 0 NOT NULL; -- Ngưỡng cảnh báo sắp hết

COMMENT ON COLUMN herbs.price_per_unit IS 'Đơn giá VNĐ theo base_unit (VD: đ/gram)';
COMMENT ON COLUMN herbs.stock_quantity IS 'Tồn kho hiện tại theo base_unit';
COMMENT ON COLUMN herbs.min_stock_quantity IS 'Ngưỡng cảnh báo sắp hết hàng theo base_unit';
