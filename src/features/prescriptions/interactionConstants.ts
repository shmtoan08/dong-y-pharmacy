export type InteractionCategory =
  | "thap_bat_phan"
  | "thap_cuu_uy"
  | "tuong_o"
  | "tuong_sat"
  | "ky_thai"
  | "khac";

export const CATEGORY_LABEL: Record<InteractionCategory, string> = {
  thap_bat_phan: "Thập bát phản",
  thap_cuu_uy: "Thập cửu úy",
  tuong_o: "Tương ố",
  tuong_sat: "Tương sát",
  ky_thai: "Kỵ thai",
  khac: "Tương tác khác",
};

export const CONTRA_LABEL: Record<string, string> = {
  pregnant: "Phụ nữ có thai",
  breastfeeding: "Cho con bú",
  children: "Trẻ nhỏ",
};
