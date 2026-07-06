// Verbatim copy of the 7-day sample menu data from legacy/index.html (mechanically extracted).
// Keyed by "${AgeKey}_${StatusKey}" — see assessment.service.ts for how the key is built.

export type AgeKey = '6-12m' | '12-24m' | '3-5y' | '6y+';
export type StatusKey = 'Bình thường' | 'Suy dinh dưỡng' | 'Thừa cân/Béo phì';

export interface MenuEntry {
  'Sáng': string[];
  'Phụ sáng': string[];
  'Trưa': string[];
  'Phụ chiều': string[];
  'Tối': string[];
  'Phụ tối': string[];
  'Ghi chú': string;
}

export const MENU_DATA: Record<string, MenuEntry> = {
  "6-12m_Bình thường": {
    "Sáng": [
      "Cháo gà xay nhuyễn 150ml",
      "Cháo lợn băm rau ngót",
      "Cháo lươn đồng cà rốt",
      "Cháo tôm bí đỏ",
      "Cháo chim câu hạt sen",
      "Cháo cá chép cải bó xôi",
      "Cháo bò khoai tây"
    ],
    "Phụ sáng": [
      "Nước cam vắt 50ml",
      "Chuối tiêu nghiền 50g",
      "Đu đủ chín nghiền 50g",
      "Nước ép táo 50ml",
      "Xoài chín xay 50g",
      "Sữa chua trẻ em 50g",
      "Nước lê ép 50ml"
    ],
    "Trưa": [
      "Cháo sườn sụn nấu nhừ",
      "Cháo cá quả mồng tơi",
      "Cháo cua đồng mướp",
      "Cháo trứng ta cà chua",
      "Cháo ếch đậu xanh",
      "Cháo thịt nạc măng tây",
      "Cháo ngao mồng tơi"
    ],
    "Phụ chiều": [
      "Sữa mẹ/CT 100ml",
      "Sữa chua 50g",
      "Váng sữa 50g",
      "Sữa mẹ/CT 100ml",
      "Sinh tố bơ 50g",
      "Sữa mẹ/CT 100ml",
      "Bánh quy dặm mềm 2 chiếc"
    ],
    "Tối": [
      "Cháo tôm mướp",
      "Cháo bò rau dền",
      "Cháo óc lợn đậu Hà Lan",
      "Cháo lươn khoai môn",
      "Cháo sườn hạt sen",
      "Cháo cá quả rau cải",
      "Cháo gà ta nấm hương"
    ],
    "Phụ tối": [
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml"
    ],
    "Ghi chú": "Thêm 1 thìa cafe (5ml) dầu ô liu/mỡ gà vào mỗi bữa cháo. 6-8 cữ bú xen kẽ."
  },
  "12-24m_Bình thường": {
    "Sáng": [
      "Bún mọc sườn (cắt nhỏ)",
      "Cháo sườn quẩy mềm",
      "Phở bò thái vụn",
      "Bánh cuốn thịt băm",
      "Xôi xéo đậu xanh",
      "Cháo lươn đồng",
      "Miến gà cắt nhỏ"
    ],
    "Phụ sáng": [
      "Sữa hạt macca",
      "Sữa chua không đường 100g",
      "Chuối tiêu 1/2 quả",
      "Váng sữa 1 hộp",
      "Bơ dầm sữa 100g",
      "Đu đủ chín 100g",
      "Nước cam vắt 100ml"
    ],
    "Trưa": [
      "Cơm nát + Cá quả kho tộ + Canh chua",
      "Cơm nát + Đậu nhồi thịt",
      "Cơm nát + Tôm xào mướp",
      "Cơm nát + Thịt băm mộc nhĩ",
      "Cơm nát + Trứng đúc thịt",
      "Cơm nát + Bò xào hành tây",
      "Cơm nát + Cá chép chưng tương"
    ],
    "Phụ chiều": [
      "Sữa tươi/CT 150ml",
      "Bánh bông lan 1 lát",
      "Chè đỗ đen mềm 100ml",
      "Sữa chua 100g",
      "Sinh tố xoài 100ml",
      "Hoa quả dầm 100g",
      "Sữa hạt hạnh nhân 150ml"
    ],
    "Tối": [
      "Cơm nát + Canh cua mướp",
      "Cơm nát + Gà ta rang gừng",
      "Cơm nát + Chả lá lốt",
      "Cơm nát + Canh sườn bí xanh",
      "Cơm nát + Cá thu sốt cà",
      "Cơm nát + Mực xào tỏi",
      "Cơm nát + Thịt rang cháy cạnh mềm"
    ],
    "Phụ tối": [
      "Sữa ấm 150ml",
      "Sữa ấm 150ml",
      "Sữa chua không đường",
      "Sữa hạt óc chó",
      "Sữa ấm 150ml",
      "Trái cây nhẹ",
      "Sữa ấm 150ml"
    ],
    "Ghi chú": "Duy trì 500ml sữa/ngày. Cắt nhỏ thức ăn, nấu chín mềm."
  },
  "3-5y_Bình thường": {
    "Sáng": [
      "Phở bò nước trong",
      "Bún chả Hà Nội",
      "Bánh khúc 1 chiếc",
      "Xôi gấc chả giò",
      "Bánh mì trứng pate",
      "Cháo trai sườn sụn",
      "Mì vằn thắn"
    ],
    "Phụ sáng": [
      "Sữa chua không đường 100g",
      "Cam sành 1/2 quả",
      "Sữa hạt óc chó 150ml",
      "Sữa tươi 150ml",
      "Dưa hấu 1 miếng",
      "Sữa hạt hạnh nhân",
      "Ổi chín 1/2 quả"
    ],
    "Trưa": [
      "Cơm + Gà nướng thảo mộc + Salad dưa leo",
      "Cơm + Cá trắm kho + Canh mùng tơi",
      "Cơm + Nem rán + Salad cà chua",
      "Cơm + Sườn xào chua ngọt",
      "Cơm + Tôm rang + Canh cải xanh",
      "Cơm + Thịt kho tàu + Canh chua",
      "Cơm + Bò lúc lắc + Salad xà lách"
    ],
    "Phụ chiều": [
      "Sữa tươi 150ml",
      "Bánh quy 2 chiếc",
      "Chè đậu xanh 1 cốc",
      "Sữa chua 100g",
      "Sữa hạt macca",
      "Bánh bao chay",
      "Sữa tươi 150ml"
    ],
    "Tối": [
      "Cơm + Đậu rán + Canh cua mướp",
      "Cơm + Gà nướng mật ong + Salad",
      "Cơm + Chả cá lăng + Rau cải luộc",
      "Cơm + Mực xào + Canh sườn",
      "Cơm + Tôm tẩm bột + Canh dền",
      "Cơm + Cá hồi áp chảo + Canh măng",
      "Cơm + Cá rô đồng rán + Canh ngót"
    ],
    "Phụ tối": [
      "Sữa chua không đường",
      "Sữa ấm 150ml",
      "Sữa hạt điều 150ml",
      "Sữa ấm 150ml",
      "Sữa ấm 150ml",
      "Sữa ấm 150ml",
      "Trái cây nhẹ"
    ],
    "Ghi chú": "Ăn chung bữa gia đình, đủ 4 nhóm chất. Dùng mỡ lợn kết hợp dầu thực vật."
  },
  "6y+_Bình thường": {
    "Sáng": [
      "Bún bò Huế 1 bát",
      "Phở gà 1 bát",
      "Xôi thịt kho trứng",
      "Bánh mì sốt vang",
      "Bún cá rô đồng",
      "Cơm rang dưa bò",
      "Bánh cuốn Thanh Trì"
    ],
    "Phụ sáng": [
      "Sữa hạt macca 180ml",
      "Trái cây theo mùa",
      "Hạnh nhân/óc chó",
      "Sữa chua 100g",
      "Trái cây theo mùa",
      "Sữa hạt hạnh nhân",
      "Sữa tươi 180ml"
    ],
    "Trưa": [
      "Cơm + Gà nướng bơ tỏi + Salad bắp cải",
      "Cơm + Cá hồi áp chảo + Salad bơ",
      "Cơm + Bò lúc lắc + Khoai tây",
      "Cơm + Chả lá lốt + Canh hến",
      "Cơm + Mực nhồi thịt + Canh mướp",
      "Cơm + Lươn xào sả ớt + Rau muống",
      "Cơm + Ức gà nướng tiêu + Canh sườn"
    ],
    "Phụ chiều": [
      "Sữa chua không đường",
      "Bánh mì gối bơ lạc",
      "Hoa quả tươi",
      "Sữa hạt điều",
      "Khoai lang luộc",
      "Sinh tố bơ",
      "Sữa hạt óc chó"
    ],
    "Tối": [
      "Cơm + Đậu sốt thịt + Canh ngao",
      "Cơm + Sườn non ram + Canh rau ngót",
      "Cơm + Gà xào nấm + Canh cải thảo",
      "Cơm + Cá kho tộ + Rau luộc",
      "Cơm + Cá hồi áp chảo + Salad dưa chuột",
      "Cơm + Trứng ốp la + Salad cà chua",
      "Cơm + Vịt quay + Canh măng tiết"
    ],
    "Phụ tối": [
      "Sữa tươi ấm 150ml",
      "Sữa chua không đường",
      "Sữa hạt macca 150ml",
      "Sữa ấm 150ml",
      "Trái cây nhẹ",
      "Sữa hạt hạnh nhân 150ml",
      "Sữa ấm 150ml"
    ],
    "Ghi chú": "Khuyến khích vận động >60 phút/ngày. Uống đủ 1.5-2L nước."
  },
  "6-12m_Suy dinh dưỡng": {
    "Sáng": [
      "Cháo sườn cốt dừa (Tăng NL)",
      "Cháo lươn dầu mè",
      "Cháo tôm mỡ hành",
      "Cháo gà nấm hương",
      "Cháo cá quả mỡ lợn",
      "Cháo bò khoai lang",
      "Cháo thịt băm bí đỏ"
    ],
    "Phụ sáng": [
      "Sữa cao năng lượng 100ml",
      "Bơ dầm sữa mẹ/CT",
      "Váng sữa nguyên kem",
      "Sữa cao năng lượng",
      "Chuối dầm bơ",
      "Sữa chua phô mai",
      "Nước cam thêm đường"
    ],
    "Trưa": [
      "Cháo cá lóc thêm 10ml mỡ",
      "Cháo thịt trứng gà",
      "Cháo cua đồng gạch",
      "Cháo bò khoai môn",
      "Cháo ếch đậu xanh",
      "Cháo chim câu hạt sen",
      "Cháo ngao mồng tơi"
    ],
    "Phụ chiều": [
      "Sữa mẹ/CT 150ml",
      "Chè đậu xanh cốt dừa",
      "Phô mai miếng",
      "Sữa F100",
      "Bánh flan caramen",
      "Sữa chua có đường",
      "Sữa mẹ/CT 150ml"
    ],
    "Tối": [
      "Cháo tôm dầu gấc",
      "Cháo óc lợn",
      "Cháo thịt măng tây",
      "Cháo sườn sụn hạt sen",
      "Cháo lươn rau ngót",
      "Cháo trứng bơ",
      "Cháo cá chép bó xôi"
    ],
    "Phụ tối": [
      "Sữa mẹ/CT 100ml",
      "Sữa F100 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml",
      "Sữa mẹ/CT 100ml"
    ],
    "Ghi chú": "Bắt buộc thêm 2 muỗng dầu/mỡ vào cháo. Ưu tiên sữa cao năng lượng."
  },
  "12-24m_Suy dinh dưỡng": {
    "Sáng": [
      "Phở bò nước béo",
      "Cháo sườn nhiều thịt",
      "Bún mọc thêm giò",
      "Xôi xéo mỡ hành",
      "Bánh cuốn chả mỡ",
      "Cháo lươn đặc",
      "Miến gà thêm da"
    ],
    "Phụ sáng": [
      "Sữa F100 150ml",
      "Váng sữa 1 hộp",
      "Chuối dầm sữa",
      "Bánh flan",
      "Sữa chua có đường",
      "Bơ dầm sữa đặc",
      "Sữa F100 150ml"
    ],
    "Trưa": [
      "Cơm nát + Cá kho ba chỉ",
      "Cơm nát + Tôm rim thịt nạc vai",
      "Cơm nát + Trứng đúc thịt",
      "Cơm nát + Thịt lợn quay giòn",
      "Cơm nát + Bò xào hành tây nhiều dầu",
      "Cơm nát + Gà rang gừng da",
      "Cơm nát + Sườn chua ngọt"
    ],
    "Phụ chiều": [
      "Chè bắp cốt dừa",
      "Sữa đặc 100ml",
      "Xúc xích chiên",
      "Khoai tây chiên",
      "Sữa cao NL 150ml",
      "Sinh tố bơ sữa",
      "Bánh quy bơ"
    ],
    "Tối": [
      "Cơm nát + Canh cua mướp gạch",
      "Cơm nát + Chả lá lốt mỡ",
      "Cơm nát + Cá trắm kho riềng",
      "Cơm nát + Đậu nhồi thịt chiên",
      "Cơm nát + Thịt rang mỡ",
      "Cơm nát + Nem rán",
      "Cơm nát + Mực xào mỡ"
    ],
    "Phụ tối": [
      "Sữa Pedia 150ml",
      "Sữa F100 150ml",
      "Sữa Pedia 150ml",
      "Sữa F100 150ml",
      "Sữa Pedia 150ml",
      "Sữa F100 150ml",
      "Sữa Pedia 150ml"
    ],
    "Ghi chú": "Năng lượng tăng 30-50%. Ăn thêm mỡ lợn, bơ, sữa đặc."
  },
  "3-5y_Suy dinh dưỡng": {
    "Sáng": [
      "Bún chả mỡ",
      "Phở gà da béo",
      "Xôi thịt trứng ốp",
      "Bánh mì pate bơ",
      "Mì vằn thắn",
      "Cháo sườn sụn quẩy",
      "Bánh khúc thịt mỡ"
    ],
    "Phụ sáng": [
      "Sữa Pedia 200ml",
      "Bánh bông lan trứng muối",
      "Váng sữa",
      "Kẹo ngọt",
      "Sinh tố xoài sữa",
      "Trái cây bơ dầm",
      "Sữa Pedia 200ml"
    ],
    "Trưa": [
      "Cơm + Thịt kho tàu (nhiều mỡ)",
      "Cơm + Nem rán giòn",
      "Cơm + Tôm rang ba chỉ",
      "Cơm + Cá diêu hồng chiên xù",
      "Cơm + Sườn chua ngọt tẩm bột",
      "Cơm + Đậu tẩm hành mỡ",
      "Cơm + Gà rán tẩm bột"
    ],
    "Phụ chiều": [
      "Chè trôi nước cốt dừa",
      "Sữa chua đá sữa đặc",
      "Bánh bao nhân thịt",
      "Sữa cao NL 200ml",
      "Khoai môn chiên bơ",
      "Kem",
      "Chè đậu đen cốt dừa"
    ],
    "Tối": [
      "Cơm + Chả rươi chiên",
      "Cơm + Thịt quay đòn",
      "Cơm + Cá trắm kho tộ",
      "Cơm + Mực chiên bơ",
      "Cơm + Trứng rán cuộn mỡ",
      "Cơm + Bò lúc lắc khoai tây",
      "Cơm + Canh sườn hầm đu đủ"
    ],
    "Phụ tối": [
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml"
    ],
    "Ghi chú": "Đảm bảo bữa nào cũng có chất béo. Bữa vặt ăn lạc, hạt điều."
  },
  "6y+_Suy dinh dưỡng": {
    "Sáng": [
      "Bún bò Huế giò heo",
      "Phở bò sốt vang",
      "Xôi gà nấm mỡ hành",
      "Bánh mì bít tết bơ",
      "Cơm rang dưa bò mỡ lợn",
      "Bún cá chiên giòn",
      "Miến lươn xào mỡ"
    ],
    "Phụ sáng": [
      "Sữa đặc 1 cốc",
      "Bánh mì bơ",
      "Xúc xích",
      "Bánh quy bơ",
      "Trái cây sấy ngọt",
      "Sữa Pedia",
      "Bơ dầm sữa"
    ],
    "Trưa": [
      "Cơm + Bê thui xào sả ớt",
      "Cơm + Thịt kho trứng ba chỉ",
      "Cơm + Cá chép om dưa mỡ lợn",
      "Cơm + Gà rang muối",
      "Cơm + Sườn nướng",
      "Cơm + Tôm sú chiên xù",
      "Cơm + Lươn om chuối đậu"
    ],
    "Phụ chiều": [
      "Trà sữa/Sữa lắc béo",
      "Gà viên chiên",
      "Khoai tây chiên",
      "Sữa cao NL 200ml",
      "Chè Thái cốt dừa",
      "Bánh ngọt",
      "Sinh tố sầu riêng"
    ],
    "Tối": [
      "Cơm + Đuôi bò hầm",
      "Cơm + Chả cá Lã Vọng",
      "Cơm + Chim quay",
      "Cơm + Nem cua bể",
      "Cơm + Thịt đông/Thịt luộc nách",
      "Cơm + Vịt nướng mỡ hành",
      "Cơm + Mực nhồi thịt chiên mắm"
    ],
    "Phụ tối": [
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml",
      "Sữa cao NL 200ml"
    ],
    "Ghi chú": "Khuyến khích ăn món xào chiên, món kho thịt ba chỉ."
  },
  "6-12m_Thừa cân/Béo phì": {
    "Sáng": [
      "Cháo rau củ tôm (Không dầu)",
      "Cháo gà nạc bí xanh",
      "Cháo cá lóc hấp rau cải",
      "Cháo thịt thăn mồng tơi",
      "Cháo ngao rau dền",
      "Cháo bò nạc su hào",
      "Cháo lươn hấp bầu"
    ],
    "Phụ sáng": [
      "Trà lúa mạch",
      "Cam múi ít ngọt",
      "Nước ép cần tây",
      "Đu đủ miếng",
      "Lê hấp",
      "Táo cắt lát",
      "Thanh long đỏ"
    ],
    "Trưa": [
      "Cháo ức gà rau ngót",
      "Cháo tôm hấp mướp",
      "Cháo cua đồng rau đay",
      "Cháo cá quả luộc cải ngọt",
      "Cháo chim câu nạc bỏ da",
      "Cháo nạc bí đỏ ít",
      "Cháo đậu hũ rau xanh"
    ],
    "Phụ chiều": [
      "Sữa hạt hạnh nhân 100ml",
      "Sữa chua không đường",
      "Nước ép ổi",
      "Củ đậu",
      "Sữa mẹ 100ml",
      "Dưa chuột",
      "Sữa tách béo 100ml"
    ],
    "Tối": [
      "Cháo cá chép hấp măng tây",
      "Cháo nghêu rau muống",
      "Cháo tôm nấm hương",
      "Cháo thịt nạc su su",
      "Cháo lươn nấu trong",
      "Cháo ếch mồng tơi",
      "Cháo gà nạc cà chua"
    ],
    "Phụ tối": [
      "Sữa mẹ 100ml",
      "Sữa tách béo 100ml",
      "Sữa mẹ 100ml",
      "Sữa tách béo 100ml",
      "Sữa mẹ 100ml",
      "Sữa tách béo 100ml",
      "Sữa mẹ 100ml"
    ],
    "Ghi chú": "Giảm lượng tinh bột (cháo loãng hơn). Tuyệt đối không thêm mỡ bơ."
  },
  "12-24m_Thừa cân/Béo phì": {
    "Sáng": [
      "Bún cá nước trong (cá luộc)",
      "Phở gà nạc (không da)",
      "Cháo sườn nạc nấu trong",
      "Miến lươn luộc",
      "Bánh cuốn chay mộc nhĩ",
      "Cháo yến mạch ức gà",
      "Súp lơ xanh luộc + trứng cút"
    ],
    "Phụ sáng": [
      "Sữa hạt macca 150ml",
      "Bưởi",
      "Ổi",
      "Táo xanh",
      "Sữa chua không đường",
      "Sữa tách béo 150ml",
      "Cà chua bi"
    ],
    "Trưa": [
      "Cơm ít + Ức gà nướng + Salad rau mầm",
      "Cơm ít + Tôm luộc + Canh rau ngót",
      "Cơm ít + Đậu hũ luộc + Cải thảo",
      "Cơm ít + Cá quả hấp + Canh chua",
      "Cơm ít + Bò nạc xào (nước) + Canh dền",
      "Cơm ít + Gà nướng bơ tỏi + Salad bắp cải",
      "Cơm ít + Canh cua mồng tơi (ít gạch)"
    ],
    "Phụ chiều": [
      "Trái cây ít ngọt",
      "Nước ép cần tây",
      "Củ đậu",
      "Dưa chuột",
      "Sữa tách béo 150ml",
      "Sữa chua không đường",
      "Sữa hạt hạnh nhân 150ml"
    ],
    "Tối": [
      "Súp bí ngô ức gà",
      "Cơm ít + Cá rô luộc + Canh cải",
      "Cơm ít + Ngao hấp sả + Salad dưa leo",
      "Súp gà ngô non",
      "Cháo yến mạch thịt băm",
      "Cơm ít + Bầu luộc chấm vừng",
      "Miến dong nấu tôm nạc"
    ],
    "Phụ tối": [
      "Sữa tách béo 150ml",
      "Sữa chua không đường",
      "Sữa tách béo 150ml",
      "Nước ép táo nhạt",
      "Sữa tách béo 150ml",
      "Sữa chua không đường",
      "Sữa tách béo 150ml"
    ],
    "Ghi chú": "Giảm nửa lượng cơm. Tăng gấp đôi rau. Chế biến chủ yếu luộc, hấp."
  },
  "3-5y_Thừa cân/Béo phì": {
    "Sáng": [
      "Phở bò nạc chín",
      "Bún ốc nước trong",
      "Bánh mì đen kẹp ức gà nướng",
      "Ngũ cốc nguyên cám sữa tươi",
      "Bún cá rô luộc",
      "Cháo yến mạch tôm nấm",
      "Khoai lang luộc + Sữa tách béo"
    ],
    "Phụ sáng": [
      "Táo xanh",
      "Sữa hạt óc chó 150ml",
      "Thanh long",
      "Ổi",
      "Dưa leo",
      "Sữa hạt macca 150ml",
      "Sữa chua không đường"
    ],
    "Trưa": [
      "Cơm lứt + Ức gà nướng thảo mộc + Salad",
      "Cơm ít + Cá chép hấp xì dầu + Cải luộc",
      "Cơm ít + Đậu luộc + Salad cà chua",
      "Cơm ít + Tôm hấp + Canh ngót",
      "Cơm ít + Bò áp chảo + Salad xà lách",
      "Cơm lứt + Cá hồi áp chảo + Salad",
      "Cơm ít + Mực hấp sả + Su hào luộc"
    ],
    "Phụ chiều": [
      "Sữa hạt hạnh nhân 150ml",
      "Sữa chua không đường",
      "Nước ép cần tây",
      "Đu đủ chín ít",
      "Trái cây ít ngọt",
      "Nước lọc",
      "Củ đậu"
    ],
    "Tối": [
      "Cơm lứt + Canh ngao mồng tơi + Đậu",
      "Cơm ít + Trứng hấp + Canh dưa",
      "Cơm ít + Cá rô luộc tẩm gừng + Canh sấu",
      "Cơm ít + Gà luộc + Salad dưa chuột",
      "Cơm ít + Ức gà nướng tiêu + Xà lách",
      "Cơm ít + Tôm nướng + Salad dưa chuột",
      "Miến dong nấu cua đồng rau nhút"
    ],
    "Phụ tối": [
      "Sữa tách béo 150ml",
      "Sữa chua không đường",
      "Sữa hạt óc chó 150ml",
      "Nước chanh nhạt",
      "Sữa tách béo 150ml",
      "Sữa hạt macca 150ml",
      "Sữa chua không đường"
    ],
    "Ghi chú": "Tuyệt đối không ăn đồ chiên rán, thức ăn nhanh. Vận động 60 phút."
  },
  "6y+_Thừa cân/Béo phì": {
    "Sáng": [
      "Phở gà thịt trắng bỏ da",
      "Bún riêu ốc (không chả)",
      "Khoai lang luộc to + Sữa hạt",
      "Ngũ cốc lúa mạch nguyên cám",
      "Bún bò nạc",
      "Bánh cuốn chay mắm nhạt",
      "Súp gà xé nấm"
    ],
    "Phụ sáng": [
      "Sữa hạt hạnh nhân 180ml",
      "Ổi 1 quả",
      "Sữa hạt óc chó 180ml",
      "Sữa chua không đường",
      "Dưa chuột 1 quả",
      "Nước ép cần tây",
      "Thanh long 1/2 quả"
    ],
    "Trưa": [
      "Cơm lứt + Cá hồi áp chảo + Salad dầu giấm",
      "Cơm lứt + Ức gà nướng tiêu xanh + Salad",
      "Cơm lứt + Tôm sú luộc + Canh bí ngao",
      "Cơm lứt + Bò áp chảo + Salad xà lách",
      "Cơm ít + Đậu sốt nấm + Rau muống luộc",
      "Cơm ít + Mực nướng sa tế + Salad dưa chuột",
      "Cơm ít + Chả cá hấp + Su su luộc"
    ],
    "Phụ chiều": [
      "Sữa hạt macca 180ml",
      "Nước chanh không đường",
      "Củ đậu",
      "Sữa chua không đường",
      "Trái cây ít ngọt",
      "Sữa tách béo 180ml",
      "Trà xanh nhạt"
    ],
    "Tối": [
      "Cơm lứt + Canh cua mướp đắng + Trứng luộc",
      "Cơm lứt + Gà nướng thảo mộc + Rau dền luộc",
      "Cơm ít + Cá rô om măng chua + Đậu bắp hấp",
      "Cơm ít + Bò thăn nướng + Salad rau mầm",
      "Cơm ít + Tép rang nhạt + Canh sấu rau rút",
      "Cơm ít + Cá hồi nướng chanh + Salad",
      "Miến dong xào ức gà rau cải (ít dầu)"
    ],
    "Phụ tối": [
      "Sữa tách béo 180ml",
      "Sữa chua không đường",
      "Sữa hạt hạnh nhân 180ml",
      "Nước ép bưởi",
      "Sữa tách béo 180ml",
      "Sữa hạt óc chó 180ml",
      "Sữa chua không đường"
    ],
    "Ghi chú": "Giảm 30% năng lượng. Loại bỏ đồ ngọt, bánh kẹo, nước có gas. Tập thể dục ra mồ hôi."
  }
};
