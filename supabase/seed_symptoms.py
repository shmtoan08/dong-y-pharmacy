#!/usr/bin/env python3
"""Seed bộ triệu chứng thường gặp theo bộ phận (plain Vietnamese, cho bệnh nhân check)."""
groups = {
    (10, "Toàn thân"): ["Phát sốt", "Ớn lạnh", "Sợ lạnh", "Sợ nóng", "Mệt mỏi", "Ra mồ hôi",
        "Ra mồ hôi trộm", "Sụt cân", "Khát nước", "Chán ăn", "Ăn nhiều", "Uống nhiều", "Ngủ nhiều"],
    (20, "Đầu mặt cổ"): ["Đau đầu", "Đau nửa đầu", "Nặng đầu", "Chóng mặt", "Hoa mắt", "Đau cổ vai gáy",
        "Cứng cổ", "Đau tai", "Ù tai", "Nghe kém", "Chảy mũi", "Nghẹt mũi", "Hắt hơi", "Chảy máu cam",
        "Đau họng", "Khàn tiếng", "Mất tiếng", "Ho", "Ho khan", "Ho có đờm", "Khạc đờm", "Hôi miệng",
        "Loét miệng", "Chảy máu chân răng", "Đau răng", "Sưng lợi", "Khó nuốt"],
    (30, "Mắt"): ["Mắt đỏ", "Mắt đau", "Mắt ngứa", "Mắt khô", "Chảy nước mắt", "Nhìn mờ",
        "Nhìn đôi", "Quầng thâm mắt", "Mí mắt sưng"],
    (40, "Ngực / Tim phổi"): ["Đau ngực", "Tức ngực", "Hồi hộp", "Đánh trống ngực", "Khó thở",
        "Thở ngắn", "Thở khò khè", "Đờm vàng", "Đờm trắng", "Ho ra máu"],
    (50, "Bụng / Tiêu hóa"): ["Đau bụng", "Đau thượng vị", "Đầy bụng", "Chướng bụng", "Sôi bụng",
        "Buồn nôn", "Nôn", "Ợ chua", "Ợ hơi", "Ăn không tiêu", "Tiêu chảy", "Táo bón", "Phân lỏng",
        "Phân nát", "Phân có máu", "Phân đen", "Mót rặn", "Đau hậu môn", "Vàng da", "Vàng mắt"],
    (60, "Tiểu tiện"): ["Tiểu buốt", "Tiểu rắt", "Tiểu nhiều", "Tiểu đêm", "Tiểu ít", "Tiểu ra máu",
        "Nước tiểu vàng", "Nước tiểu đục", "Bí tiểu", "Són tiểu"],
    (70, "Khớp / Cơ xương"): ["Sưng khớp", "Đau khớp", "Đau khớp chân", "Đi lại khó khăn", "Cứng khớp",
        "Biến dạng khớp", "Đau khớp tay", "Đau khớp gối", "Đau lưng", "Đau thắt lưng", "Đau cổ",
        "Đau vai", "Đau cơ", "Tê bì", "Tê tay", "Tê chân", "Chuột rút", "Co quắp", "Yếu cơ",
        "Hạn chế vận động", "Phù chân", "Chân tay lạnh"],
    (80, "Da"): ["Ngứa da", "Nổi mẩn", "Nổi mề đay", "Mụn nhọt", "Lở loét", "Da khô", "Da vàng",
        "Da xanh", "Mồ hôi tay chân", "Tóc rụng"],
    (90, "Sắc mặt"): ["Sắc mặt vàng đỏ", "Sắc mặt trắng bệch", "Sắc mặt vàng", "Sắc mặt xanh",
        "Sắc mặt đỏ", "Sắc mặt đen sạm", "Gò má đỏ"],
    (100, "Môi"): ["Môi đỏ sẫm", "Môi nhợt", "Môi tím", "Môi khô", "Lở môi", "Nứt môi"],
    (110, "Lưỡi"): ["Lưỡi đỏ sẫm", "Rêu lưỡi trắng", "Gốc lưỡi hơi vàng", "Lưỡi nhạt", "Lưỡi tím",
        "Lưỡi có dấu răng", "Lưỡi khô", "Lưỡi ướt", "Rêu lưỡi vàng", "Rêu lưỡi dày", "Rêu lưỡi mỏng",
        "Không rêu lưỡi"],
    (120, "Mạch"): ["Mạch tế", "Mạch sác", "Mạch nhu", "Mạch phù", "Mạch trầm", "Mạch trì",
        "Mạch huyền", "Mạch hoạt", "Mạch hồng", "Mạch nhược", "Mạch khẩn", "Mạch kết", "Mạch đại"],
    (130, "Tâm thần"): ["Mất ngủ", "Khó ngủ", "Hay quên", "Lo âu", "Bồn chồn", "Dễ cáu gắt",
        "Trầm buồn", "Sợ hãi", "Hay mơ", "Nói mê", "Co giật", "Động kinh", "Liệt mặt", "Méo miệng"],
    (140, "Phụ khoa"): ["Kinh nguyệt không đều", "Đau bụng kinh", "Rong kinh", "Kinh ít", "Kinh nhiều",
        "Khí hư", "Khí hư vàng", "Đau bụng dưới", "Khó thụ thai", "Tắc sữa", "Ít sữa"],
    (150, "Trẻ em"): ["Quấy khóc", "Biếng ăn", "Chậm mọc răng", "Chậm biết đi", "Sốt cao co giật", "Đái dầm"],
}

# Kiểm tra trùng tên
all_names = [n for _, names in groups.items() for n in names]
assert len(all_names) == len(set(all_names)), "Trùng tên: " + str([n for n in set(all_names) if all_names.count(n) > 1])
print(f"Total: {len(all_names)} triệu chứng, {len(groups)} nhóm")

lines = []
for (order, cat), names in sorted(groups.items()):
    for n in names:
        esc = n.replace("'", "''")
        lines.append(
            f"INSERT INTO symptoms (name, category, sort_order) VALUES ('{esc}', '{cat}', {order}) "
            f"ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, sort_order = EXCLUDED.sort_order;"
        )
with open('/tmp/seed_symptoms.sql', 'w') as f:
    f.write('\n'.join(lines) + '\n')
print("Wrote /tmp/seed_symptoms.sql")
