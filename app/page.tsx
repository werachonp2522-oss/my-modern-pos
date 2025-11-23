'use client';

import React, { useState, useEffect, useMemo } from 'react';
// ✅ บรรทัดนี้ถูกต้องแล้วครับ แต่ต้องผ่านการสั่ง npm install @supabase/supabase-js ก่อน
import { createClient } from '@supabase/supabase-js'; 

import { 
  LayoutGrid, ShoppingCart, Package, Users, Settings, LogOut, 
  Search, Plus, Minus, Trash2, CreditCard, Coffee, CupSoda, 
  Utensils, X, CheckCircle, BarChart3, DollarSign, TrendingUp, 
  QrCode, History, AlertCircle, Loader2, RefreshCw, Lock, UserPlus, Edit, Save, Printer
} from 'lucide-react';

// --- ⚙️ การตั้งค่าร้านค้า (CONFIG) ---
const SHOP_NAME = "My Modern Cafe";
const SHOP_ADDRESS = "ชั้น G ห้างสยามพารากอน กรุงเทพฯ";
const TAX_ID = "0105551234567"; // เลขผู้เสียภาษี (สมมติ)
const PRIMARY_COLOR = "indigo"; 
const ADMIN_PIN = "123456"; 
const SHOP_PROMPTPAY_ID = '0812345678'; 

// --- ⚠️ Supabase Config ---
const SUPABASE_URL = 'https://xvrhvrzsnwqorxokcauc.supabase.co';
// 🔴 อย่าลืมเอา Key ยาวๆ (ที่ขึ้นต้นด้วย ey...) มาใส่ตรงนี้นะครับ ห้ามมีภาษาไทยปน
const SUPABASE_KEY = 'sb_publishable_HvCq3JH2wpVXtgEk38ikhg_uwvO5ae5'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = [
  { id: 'All', label: 'ทั้งหมด', icon: <LayoutGrid size={18}/> },
  { id: 'Coffee', label: 'กาแฟ', icon: <Coffee size={18}/> },
  { id: 'Tea', label: 'ชา', icon: <CupSoda size={18}/> },
  { id: 'Bakery', label: 'เบเกอรี่', icon: <Utensils size={18}/> },
  { id: 'Cocoa', label: 'โกโก้', icon: <CupSoda size={18}/> },
  { id: 'Drink', label: 'เครื่องดื่ม', icon: <CupSoda size={18}/> },
  { id: 'Food', label: 'อาหาร', icon: <Utensils size={18}/> },
];

const MOCK_MEMBERS = [
  { id: 1, name: 'คุณลูกค้า ทั่วไป', type: 'General', points: 0 },
];

export default function POSSystem() {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // --- App State ---
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  // --- Cart & Transaction State ---
  const [cart, setCart] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loadingPayment, setLoadingPayment] = useState(false);

  // --- Management State ---
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: 'Coffee', stock: 10, color: 'bg-gray-100' });
  
  // --- Member Management State (NEW) ---
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ id: null, name: '', phone: '' });
  const [isEditingMember, setIsEditingMember] = useState(false);

  // --- Initial Fetch ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').order('id');
      if (pData) setProducts(pData);

      const { data: mData, error: mError } = await supabase.from('members').select('*').order('id');
      if (!mError && mData) {
        setMembers(mData);
        // ถ้ายังไม่ได้เลือกสมาชิก หรือสมาชิกที่เลือกถูกลบไป ให้กลับมาเลือก Guest
        if (!selectedMember || !mData.find(m => m.id === selectedMember.id)) {
            const guest = mData.find(m => m.id === 1) || mData[0];
            setSelectedMember(guest);
        } else {
            // อัปเดตแต้มสมาชิกที่เลือกอยู่ให้เป็นปัจจุบัน
            const current = mData.find(m => m.id === selectedMember.id);
            if (current) setSelectedMember(current);
        }
      }

      const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
      if (oData) setOrders(oData);

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  // --- Logic: Login ---
  const handleLogin = (num) => {
    if (num === 'clear') { setPinInput(''); return; }
    if (num === 'enter') {
      if (pinInput === ADMIN_PIN) setIsLoggedIn(true);
      else { alert('รหัสผิดครับ!'); setPinInput(''); }
      return;
    }
    if (pinInput.length < 6) setPinInput(prev => prev + num);
  };

  // --- Logic: Cart ---
  const addToCart = (product) => {
    if (product.stock <= 0) return;
    const exist = cart.find((x) => x.id === product.id);
    if (exist && exist.qty >= product.stock) { alert('สินค้าหมดสต็อก!'); return; }
    
    if (exist) setCart(cart.map((x) => x.id === product.id ? { ...exist, qty: exist.qty + 1 } : x));
    else setCart([...cart, { ...product, qty: 1 }]);
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (delta > 0) {
           const product = products.find(p => p.id === id);
           if (newQty > product.stock) return item;
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(x => x.id !== id));

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const netTotal = totalAmount * 1.07;

  // --- Logic: Payment & Print (UPDATED) ---
  const printReceipt = (transaction) => {
    const receiptWindow = window.open('', 'Print Receipt', 'height=600,width=400');
    // สร้างใบเสร็จแบบสวยงาม (HTML+CSS)
    const receiptContent = `
      <html>
        <head>
          <title>ใบเสร็จรับเงิน - ${SHOP_NAME}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Sarabun', sans-serif; padding: 20px; font-size: 12px; color: #333; }
            .container { width: 100%; max-width: 320px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 15px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 5px;}
            .info { font-size: 10px; color: #666; line-height: 1.4; }
            .divider { border-top: 1px dashed #bbb; margin: 10px 0; }
            .line { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 60px; text-align: right; }
            .total-section { margin-top: 10px; padding-top: 5px; border-top: 1px solid #eee; }
            .grand-total { font-size: 18px; font-weight: bold; color: #000; margin-top: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #888; }
            @media print { @page { margin: 0; } body { margin: 1cm; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">☕ ${SHOP_NAME}</div>
              <div class="info">${SHOP_ADDRESS}<br>โทร: 02-123-4567<br>เลขประจำตัวผู้เสียภาษี: ${TAX_ID}</div>
              <div class="divider"></div>
              <div style="display:flex; justify-content:space-between; font-size:10px;">
                <span>ใบเสร็จรับเงิน / ABBR INV.</span>
                <span>#${transaction.id}</span>
              </div>
              <div style="text-align:left; font-size:10px;">วันที่: ${transaction.date}</div>
              <div style="text-align:left; font-size:10px;">ลูกค้า: ${transaction.customer}</div>
            </div>
            <div class="divider"></div>
            
            <div style="font-weight:bold; margin-bottom:5px;" class="line">
                <span class="item-name">รายการ</span>
                <span class="item-qty">จำนวน</span>
                <span class="item-price">รวม</span>
            </div>

            ${transaction.items.map(item => `
              <div class="line">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.qty}</span>
                <span class="item-price">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            `).join('')}

            <div class="divider"></div>
            
            <div class="line"><span>รวมเป็นเงิน (Subtotal)</span><span>${(transaction.total / 1.07).toFixed(2)}</span></div>
            <div class="line"><span>ภาษีมูลค่าเพิ่ม 7% (VAT)</span><span>${(transaction.total - (transaction.total / 1.07)).toFixed(2)}</span></div>
            <div class="line grand-total"><span>ยอดสุทธิ (Net Total)</span><span>฿${transaction.total.toFixed(2)}</span></div>
            
            <div class="divider"></div>
            <div class="line"><span>ชำระโดย (Payment)</span><span>${transaction.method === 'qr' ? 'QR PromptPay' : 'เงินสด (Cash)'}</span></div>
            <div class="line"><span>แต้มสะสม (Points Earned)</span><span>${transaction.pointsEarned || 0}</span></div>
            
            <div class="footer">
              <p>ขอบคุณที่อุดหนุนครับ 🙏<br>สินค้าซื้อแล้วไม่รับเปลี่ยนคืน<br>Powered by ModernPOS</p>
            </div>
          </div>
          <script>
            window.print();
            // window.close(); // Uncomment ถ้าอยากให้ปิดอัตโนมัติ
          </script>
        </body>
      </html>
    `;
    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
  };

  const confirmPayment = async () => {
    setLoadingPayment(true);
    const invId = `INV-${Date.now().toString().slice(-6)}`;
    try {
      // 1. Save Order
      await supabase.from('orders').insert([{
          id: invId,
          total: netTotal,
          payment_method: paymentMethod,
          items: cart 
      }]);

      // 2. Cut Stock
      for (const item of cart) {
        const p = products.find(p => p.id === item.id);
        if (p) await supabase.from('products').update({ stock: p.stock - item.qty }).eq('id', item.id);
      }

      // 3. Update Points
      let pointsEarned = 0;
      if (selectedMember && selectedMember.id !== 1) {
         pointsEarned = Math.floor(netTotal / 10);
         await supabase.from('members').update({ points: selectedMember.points + pointsEarned }).eq('id', selectedMember.id);
      }

      // 4. Print Receipt
      const transaction = {
        id: invId,
        date: new Date().toLocaleString('th-TH'),
        total: netTotal,
        items: [...cart],
        method: paymentMethod,
        customer: selectedMember?.name || 'ทั่วไป',
        pointsEarned: pointsEarned
      };
      printReceipt(transaction);

      setCart([]);
      setShowPaymentModal(false);
      fetchData(); 
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoadingPayment(false);
    }
  };

  // --- Logic: Add/Edit Member (UPDATED) ---
  const openAddMember = () => {
    setMemberForm({ id: null, name: '', phone: '' });
    setIsEditingMember(false);
    setShowMemberModal(true);
  };

  const openEditMember = (member) => {
    setMemberForm({ id: member.id, name: member.name, phone: member.phone });
    setIsEditingMember(true);
    setShowMemberModal(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.phone) return alert('กรอกข้อมูลให้ครบ');
    
    try {
        if (isEditingMember) {
            // แก้ไข
            const { error } = await supabase.from('members')
                .update({ name: memberForm.name, phone: memberForm.phone })
                .eq('id', memberForm.id);
            if (error) throw error;
            alert('แก้ไขข้อมูลสมาชิกเรียบร้อย!');
        } else {
            // เพิ่มใหม่
            const { error } = await supabase.from('members')
                .insert([{ name: memberForm.name, phone: memberForm.phone }]);
            if (error) throw error;
            alert('สมัครสมาชิกเรียบร้อย!');
        }
        setShowMemberModal(false);
        fetchData();
    } catch (err) {
        alert('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  const handleDeleteMember = async (id) => {
    if (id === 1) return alert('ไม่สามารถลบลูกค้าทั่วไปได้');
    if (!confirm('ยืนยันลบสมาชิกท่านนี้? คะแนนสะสมจะหายไปทั้งหมด')) return;
    
    try {
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;
        // ถ้าลบคนที่เลือกอยู่ ให้กลับไปเลือก Guest
        if (selectedMember?.id === id) setSelectedMember(members.find(m => m.id === 1) || null);
        fetchData();
    } catch (err) {
        alert('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  // --- Logic: Product Management ---
  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) return alert('กรุณากรอกข้อมูลให้ครบ');
    const { error } = await supabase.from('products').insert([newProduct]);
    if (!error) {
      alert('เพิ่มสินค้าเรียบร้อย!');
      setShowAddProduct(false);
      fetchData();
    } else {
      alert('เพิ่มสินค้าไม่สำเร็จ: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if(!confirm('ยืนยันลบสินค้านี้?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
  };

  // --- Render Views ---

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-96 text-center animate-in zoom-in duration-300">
          <div className={`w-20 h-20 bg-${PRIMARY_COLOR}-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg shadow-${PRIMARY_COLOR}-200`}>
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{SHOP_NAME}</h1>
          <p className="text-gray-500 mb-8 text-sm">กรุณาใส่รหัสพนักงานเพื่อเข้าใช้งาน</p>
          <div className="mb-8">
            <div className="flex justify-center gap-4 mb-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pinInput.length ? `bg-${PRIMARY_COLOR}-600 scale-110` : 'bg-gray-200'}`}></div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} onClick={() => handleLogin(n.toString())} className="h-16 rounded-xl bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-sm border border-gray-100">{n}</button>
            ))}
            <button onClick={() => handleLogin('clear')} className="h-16 rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100 active:scale-95 transition flex items-center justify-center"><X /></button>
            <button onClick={() => handleLogin('0')} className="h-16 rounded-xl bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-sm border border-gray-100">0</button>
            <button onClick={() => handleLogin('enter')} className={`h-16 rounded-xl bg-${PRIMARY_COLOR}-600 text-white font-bold hover:bg-${PRIMARY_COLOR}-700 active:scale-95 transition flex items-center justify-center shadow-lg shadow-${PRIMARY_COLOR}-200`}>เข้า</button>
          </div>
          <p className="text-xs text-gray-400">Default PIN: {ADMIN_PIN}</p>
        </div>
      </div>
    )
  }

  const POSView = () => (
    <div className="flex h-full flex-col md:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between shrink-0 z-10">
          <h1 className={`text-lg font-bold text-gray-800 flex items-center gap-2`}><Coffee className={`text-${PRIMARY_COLOR}-600`} /> {SHOP_NAME}</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาสินค้า..." className={`w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-${PRIMARY_COLOR}-500 rounded-full transition-all outline-none text-sm`} />
          </div>
        </header>
        <div className="px-6 py-3 bg-white border-b flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id ? `bg-${PRIMARY_COLOR}-600 text-white shadow-lg` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cat.icon}{cat.label}
            </button>
          ))}
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.includes(searchQuery)).map(p => (
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className={`relative bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-between h-48 transition-all duration-200 group ${p.stock <= 0 ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'}`}>
                <div className={`w-20 h-20 rounded-full ${p.color || 'bg-gray-100'} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner text-gray-600`}>
                   {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover rounded-full" /> : <Coffee size={32}/>}
                </div>
                <div className="text-center w-full">
                  <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-1">{p.name}</h3>
                  <p className={`text-${PRIMARY_COLOR}-600 font-extrabold`}>฿{p.price}</p>
                </div>
                <div className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock < 10 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                  {p.stock === 0 ? 'หมด' : `${p.stock}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <aside className="w-full md:w-96 bg-white border-l flex flex-col shadow-2xl z-20 h-[40vh] md:h-auto">
        <div className={`p-4 border-b bg-${PRIMARY_COLOR}-50/50`}>
           <div className="flex items-center justify-between mb-2">
             <span className={`text-xs font-bold text-${PRIMARY_COLOR}-900 uppercase flex items-center gap-1`}><Users size={14}/> ลูกค้า</span>
             <select 
                className="text-xs bg-white border rounded px-2 py-1 outline-none"
                value={selectedMember?.id || ''}
                onChange={(e) => setSelectedMember(members.find(m => m.id == e.target.value))}
             >
                {members.length === 0 && <option>กำลังโหลด...</option>}
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
             </select>
           </div>
           <div className={`flex items-center gap-3 bg-white p-3 rounded-xl border border-${PRIMARY_COLOR}-100 shadow-sm`}>
             <div className={`w-10 h-10 bg-gradient-to-br from-${PRIMARY_COLOR}-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow`}>
               {selectedMember?.name ? selectedMember.name.charAt(0) : '?'}
             </div>
             <div className="flex-1 min-w-0">
               <h4 className="font-bold text-sm truncate text-gray-800">{selectedMember?.name || 'ลูกค้าทั่วไป'}</h4>
               <p className="text-xs text-gray-500">{selectedMember?.points || 0} แต้มสะสม</p>
             </div>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-3 opacity-60 select-none"><ShoppingCart size={48} /><p className="text-sm">ยังไม่มีสินค้าในตะกร้า</p></div>
          ) : (
            cart.map(item => (
              <div key={item.id} className={`flex items-center gap-3 p-2 md:p-3 bg-white border border-gray-100 hover:border-${PRIMARY_COLOR}-300 rounded-xl transition-all shadow-sm`}>
                <div className="flex flex-col items-center gap-1">
                   <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-green-100 hover:text-green-600 flex items-center justify-center"><Plus size={12}/></button>
                   <span className="text-sm font-bold text-gray-800 w-6 text-center">{item.qty}</span>
                   <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center"><Minus size={12}/></button>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm text-gray-800 truncate">{item.name}</h5>
                  <p className="text-xs text-gray-400">@{item.price}</p>
                </div>
                <div className="text-right"><p className={`font-bold text-${PRIMARY_COLOR}-600`}>฿{item.price * item.qty}</p></div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))
          )}
        </div>
        <div className="p-4 md:p-6 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-gray-500"><span>ยอดรวม</span><span>฿{totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500"><span>VAT (7%)</span><span>฿{(totalAmount * 0.07).toFixed(2)}</span></div>
            <div className="flex justify-between text-2xl font-bold text-gray-800 pt-2 border-t border-dashed border-gray-200"><span>สุทธิ</span><span className={`text-${PRIMARY_COLOR}-600`}>฿{netTotal.toFixed(2)}</span></div>
          </div>
          <button onClick={() => cart.length > 0 && setShowPaymentModal(true)} disabled={cart.length === 0} className={`w-full py-3 md:py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 group ${cart.length > 0 ? `bg-${PRIMARY_COLOR}-600 text-white hover:bg-${PRIMARY_COLOR}-700 hover:shadow-${PRIMARY_COLOR}-200 hover:-translate-y-1` : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            <span>ชำระเงิน</span>
          </button>
        </div>
      </aside>
    </div>
  );

  const StockView = () => (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package /> จัดการสต็อก</h2>
        <button onClick={() => setShowAddProduct(true)} className={`bg-${PRIMARY_COLOR}-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-${PRIMARY_COLOR}-700 shadow-lg`}><Plus size={20}/> เพิ่มสินค้า</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
            <tr><th className="p-4">สินค้า</th><th className="p-4 text-right">ราคา</th><th className="p-4 text-center">คงเหลือ</th><th className="p-4 text-center">จัดการ</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{p.name} <span className="text-gray-400 text-xs">({p.category})</span></td>
                <td className="p-4 text-right">฿{p.price}</td>
                <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{p.stock}</span></td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- Members View (UPDATED with Edit/Delete) ---
  const MembersView = () => (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users /> จัดการสมาชิก</h2>
        <button onClick={openAddMember} className={`bg-${PRIMARY_COLOR}-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-${PRIMARY_COLOR}-700 shadow-lg`}><UserPlus size={20}/> สมัครสมาชิก</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {members.map(m => (
          <div key={m.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition flex items-center gap-4 relative group">
            <div className={`w-12 h-12 bg-${PRIMARY_COLOR}-100 text-${PRIMARY_COLOR}-600 rounded-full flex items-center justify-center font-bold text-xl`}>{m.name.charAt(0)}</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">{m.name}</h3>
              <p className="text-gray-500 text-sm">{m.phone}</p>
              <span className="inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded mt-1">⭐ {m.points} แต้ม</span>
            </div>
            {/* ปุ่มแก้ไข/ลบ (จะแสดงเมื่อเอาเมาส์ไปวาง หรือแตะ) */}
            {m.id !== 1 && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditMember(m)} className="text-gray-400 hover:text-blue-500 p-1 bg-gray-50 rounded-md"><Edit size={16}/></button>
                <button onClick={() => handleDeleteMember(m.id)} className="text-gray-400 hover:text-red-500 p-1 bg-gray-50 rounded-md"><Trash2 size={16}/></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-slate-700 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-24 bg-slate-900 text-white flex-col items-center py-6 space-y-8 shadow-xl z-30 shrink-0">
        <div className={`w-12 h-12 bg-gradient-to-br from-${PRIMARY_COLOR}-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg`}>{SHOP_NAME.charAt(0)}</div>
        <nav className="flex-1 w-full flex flex-col items-center space-y-6">
          <NavButton icon={<ShoppingCart />} label="ขาย" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
          <NavButton icon={<Package />} label="สต็อก" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
          <NavButton icon={<Users />} label="สมาชิก" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
        </nav>
        <button onClick={() => setIsLoggedIn(false)} className="p-3 text-gray-500 hover:text-red-400 transition mt-auto"><LogOut size={24} /></button>
      </aside>

      <main className="flex-1 h-full relative">
        {activeTab === 'pos' && <POSView />}
        {activeTab === 'stock' && <StockView />}
        {activeTab === 'members' && <MembersView />}
      
        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
               <div className="text-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-800">ชำระเงิน</h2>
                 <p className="text-gray-500">สมาชิก: {selectedMember?.name}</p>
                 <h1 className={`text-5xl font-extrabold text-${PRIMARY_COLOR}-600 mt-3`}>฿{netTotal.toFixed(2)}</h1>
               </div>
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <button onClick={() => setPaymentMethod('cash')} className={`py-4 rounded-2xl font-bold border-2 transition flex flex-col items-center gap-2 ${paymentMethod === 'cash' ? `border-${PRIMARY_COLOR}-600 bg-${PRIMARY_COLOR}-50 text-${PRIMARY_COLOR}-600` : 'border-transparent bg-gray-100'}`}><DollarSign size={28} /> เงินสด</button>
                  <button onClick={() => setPaymentMethod('qr')} className={`py-4 rounded-2xl font-bold border-2 transition flex flex-col items-center gap-2 ${paymentMethod === 'qr' ? `border-${PRIMARY_COLOR}-600 bg-${PRIMARY_COLOR}-50 text-${PRIMARY_COLOR}-600` : 'border-transparent bg-gray-100'}`}><QrCode size={28} /> QR Code</button>
               </div>
               {paymentMethod === 'qr' && (
                 <div className="flex flex-col items-center justify-center py-4 bg-blue-50 rounded-2xl mb-6">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100">
                      <img src={`https://promptpay.io/${SHOP_PROMPTPAY_ID}/${netTotal}`} className="w-[180px] h-[180px] mix-blend-multiply" alt="QR"/>
                    </div>
                 </div>
               )}
               <div className="flex gap-4">
                 <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
                 <button onClick={confirmPayment} disabled={loadingPayment} className={`flex-1 py-3 bg-${PRIMARY_COLOR}-600 text-white rounded-xl font-bold shadow-lg flex justify-center items-center gap-2`}>{loadingPayment ? <Loader2 className="animate-spin"/> : <>ยืนยัน <Printer size={18}/></>}</button>
               </div>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {showAddProduct && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 animate-in zoom-in">
              <h3 className="text-xl font-bold mb-4">เพิ่มสินค้าใหม่</h3>
              <div className="space-y-3">
                <input placeholder="ชื่อสินค้า" className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <input type="number" placeholder="ราคา" className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                <select className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {CATEGORIES.filter(c => c.id !== 'All').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input type="number" placeholder="จำนวนสต็อก" className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 py-2 text-gray-500">ยกเลิก</button>
                <button onClick={handleAddProduct} className={`flex-1 py-2 bg-${PRIMARY_COLOR}-600 text-white rounded-lg`}>บันทึก</button>
              </div>
            </div>
          </div>
        )}

        {/* Member Modal (UPDATED for Add/Edit) */}
        {showMemberModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 animate-in zoom-in">
              <h3 className="text-xl font-bold mb-4">{isEditingMember ? 'แก้ไขข้อมูลสมาชิก' : 'สมัครสมาชิกใหม่'}</h3>
              <div className="space-y-3">
                <input placeholder="ชื่อ-สกุล" className="w-full border p-2 rounded" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} />
                <input placeholder="เบอร์โทรศัพท์" className="w-full border p-2 rounded" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowMemberModal(false)} className="flex-1 py-2 text-gray-500">ยกเลิก</button>
                <button onClick={handleSaveMember} className={`flex-1 py-2 bg-${PRIMARY_COLOR}-600 text-white rounded-lg flex items-center justify-center gap-2`}><Save size={18}/> บันทึก</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl transition-all duration-200 relative group p-3 w-20 ${active ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}>
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : ''}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);