const G={cokelat:'#8d5524',biru:'#4fc3f7',pink:'#ec6aa6',oren:'#fb8c00',merah:'#e53935',kuning:'#fdd835',hijau:'#2e9e5b',nila:'#3949ab'};
const P=(n,p,g)=>({n,t:'p',p,g}),S=(n,t,p)=>({n,t,p});
// t: s=start p=properti r=aset/transport x=pajak c=kesempatan k=risiko j=lapas g=masuk lapas f=parkir bebas
const B=[S('GAJIAN','s'),P('Warung Pecel Lele',60,'cokelat'),S('KESEMPATAN','c'),P('Harga Cabai Meroket',60,'cokelat'),S('PPN 12%','x',100),S('KRL Overload','r',200),
P('Antre Minyak Goreng',100,'biru'),S('RISIKO','k'),P('Jalan Berlubang',100,'biru'),P('Parkir Liar',120,'biru'),
S('LAPAS','j'),P('Banjir Langganan',140,'pink'),S('Token Listrik Naik','r',150),P('Macet Tol',140,'pink'),P('Pungli Samsat',160,'pink'),S('Kereta Cepat Utang','r',200),
P('Pinjol Ilegal',180,'oren'),S('KESEMPATAN','c'),P('Judol Online',180,'oren'),P('Tambang Ilegal',200,'oren'),
S('STUDI BANDING','f'),P('Kabut Asap',220,'merah'),S('RISIKO','k'),P('Reklamasi Bermasalah',220,'merah'),P('Hutan Gundul',240,'merah'),S('Ojol Mogok','r',200),
P('Proyek Mangkrak',260,'kuning'),P('Tol Fiktif',260,'kuning'),S('PDAM Keruh','r',150),P('Sekolah Roboh',280,'kuning'),
S('OPERASI TANGKAP TANGAN','g'),P('PHK Massal',300,'hijau'),P('Gaji di Bawah UMR',300,'hijau'),S('KESEMPATAN','c'),P('Tapera Dipotong',320,'hijau'),S('Bus Telat','r',200),
S('RISIKO','k'),P('Bansos Bocor',350,'nila'),S('Pajak Titipan','x',150),P('Dana Hibah Siluman',400,'nila')];
const K=[['Proyek cair! Komisi masuk +Rp100jt','m',100],['Konten viral, endorse +Rp80jt','m',80],['Bansos nyasar ke rekeningmu +Rp60jt','m',60],['Naik KRL ke GAJIAN, terima Rp200jt','g',0],['Diundang jadi saksi... masuk LAPAS!','j',0],['Cabai turun harga, hemat +Rp40jt','m',40]];
const R=[['Banjir bandang! Ganti rugi -Rp120jt','m',-120],['Pinjol menagih -Rp80jt','m',-80],['Kena PHK dadakan -Rp100jt','m',-100],['Kena razia pungli -Rp70jt','m',-70],['BBM naik lagi -Rp60jt','m',-60],['Digelandang OTT, masuk LAPAS!','j',0]];
module.exports={B,G,K,R};
