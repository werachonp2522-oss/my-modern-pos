'use client';

import React, { useState, useEffect, useMemo } from 'react';
// ✅ ใช้การเชื่อมต่อแบบมาตรฐาน (รองรับ Vercel 100%)
import { createClient } from '@supabase/supabase-js'; 

import { 
  LayoutGrid, ShoppingCart, Package, Users, Settings, LogOut, 
  Search, Plus, Minus, Trash2, CreditCard, Coffee, CupSoda, 
  Utensils, X, CheckCircle, BarChart3, DollarSign, TrendingUp, 
  QrCode, History, AlertCircle, Loader2, RefreshCw, Lock, UserPlus, Edit, Save, Printer
} from 'lucide-react';

// --- ⚙️ การตั้งค่าร้านค้า ---
const SHOP_NAME = "My Modern Cafe";
const SHOP_ADDRESS = "ชั้น G ห้างสยามพารากอน กรุงเทพฯ";
const TAX_ID = "0105551234567"; 
const PRIMARY_COLOR = "indigo"; 
const ADMIN_PIN = "123456"; 
const SHOP_PROMPTPAY_ID = '0812345678'; 

// --- ⚠️ Supabase Config ---
const SUPABASE_URL = 'https://xvrhvrzsnwqorxokcauc.supabase.co';
// ✅ Key ของคุณ
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmh2cnpzbndxb3J4b2tjYXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjYyNTUsImV4cCI6MjA3OTM0MjI1NX0.N2Q6R4-8tmd2n0n02wBvxYTDr32sisH28FKNiwSEyi8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = [
  { id: 'All', label: 'ทั้งหมด', icon: <LayoutGrid size={14}/> },
  { id: 'Coffee', label: 'กาแฟ', icon: <Coffee size={14}/> },
  { id: 'Tea', label: 'ชา', icon: <CupSoda size={14}/> },
  { id: 'Bakery', label: 'เบเกอรี่', icon: <Utensils size={14}/> },
  { id: 'Cocoa', label: 'โกโก้', icon: <CupSoda size={14}/> },
  { id: 'Drink', label: 'เครื่องดื่ม', icon: <CupSoda size={14}/> },
  { id: 'Food', label: 'อาหาร', icon: <Utensils size={14}/> },
];

const MOCK_MEMBERS = [
  { id: 1, name: 'คุณลูกค้า ทั่วไป', type: 'General', points: 0 },
];

export default function POSSystem() {
  // --- 1. HOOKS ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [cart, setCart] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: 'Coffee', stock: 10, color: 'bg-gray-100' });
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ id: null, name: '', phone: '' });
  const [isEditingMember, setIsEditingMember] = useState(false);

  // --- 2. MEMOS & EFFECTS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('products').select('*').order('id');
      if (pData) setProducts(pData);

      const { data: mData, error: mError } = await supabase.from('members').select('*').order('id');
      if (!mError && mData) {
        setMembers(mData);
        if (!selectedMember) {
             const guest = mData.find(m => m.id === 1) || mData[0];
             if(guest) setSelectedMember(guest);
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

  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at.startsWith(today));
    return { 
        sales: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        count: todayOrders.length,
        lowStock: products.filter(p => p.stock < 10).length
    };
  }, [orders, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const netTotal = totalAmount * 1.07;

  // --- 3. LOGIC FUNCTIONS ---
  const handleLogin = (num) => {
    if (num === 'clear') { setPinInput(''); return; }
    if (num === 'enter') {
      if (pinInput === ADMIN_PIN) setIsLoggedIn(true);
      else { alert('รหัสผิดครับ!'); setPinInput(''); }
      return;
    }
    if (pinInput.length < 6) setPinInput(prev => prev + num);
  };

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

  const printReceipt = (transaction) => {
    const receiptWindow = window.open('', 'Print Receipt', 'height=600,width=400');
    const receiptContent = `
      <html>
        <head><title>ใบเสร็จรับเงิน</title><style>body{font-family:sans-serif;padding:20px;font-size:12px;color:#333;}.container{width:100%;max-width:300px;margin:0 auto;text-align:center;}.divider{border-top:1px dashed #bbb;margin:10px 0;}.line{display:flex;justify-content:space-between;margin-bottom:4px;}</style></head>
        <body>
          <div class="container">
            <h3>${SHOP_NAME}</h3><p>${SHOP_ADDRESS}<br>TAX ID: ${TAX_ID}</p><div class="divider"></div>
            <div class="line"><span>INV: ${transaction.id}</span><span>${transaction.date}</span></div><div class="divider"></div>
            ${transaction.items.map(item => `<div class="line"><span style="text-align:left;flex:1;">${item.name} x${item.qty}</span><span>${(item.price * item.qty).toFixed(2)}</span></div>`).join('')}
            <div class="divider"></div><div class="line" style="font-weight:bold;"><span>ยอดสุทธิ</span><span>฿${transaction.total.toFixed(2)}</span></div>
            <div class="line"><span>ชำระโดย</span><span>${transaction.method}</span></div><div class="divider"></div><p>ขอบคุณที่ใช้บริการ</p>
          </div>
          <script>window.print();</script>
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
      await supabase.from('orders').insert([{ id: invId, total: netTotal, payment_method: paymentMethod, items: cart }]);
      for (const item of cart) {
        const p = products.find(p => p.id === item.id);
        if (p) await supabase.from('products').update({ stock: p.stock - item.qty }).eq('id', item.id);
      }
      let pointsEarned = 0;
      if (selectedMember && selectedMember.id !== 1) {
         pointsEarned = Math.floor(netTotal / 10);
         await supabase.from('members').update({ points: selectedMember.points + pointsEarned }).eq('id', selectedMember.id);
      }
      const transaction = {
        id: invId, date: new Date().toLocaleString('th-TH'), total: netTotal, items: [...cart],
        method: paymentMethod === 'qr' ? 'QR PromptPay' : 'เงินสด',
        customer: selectedMember?.name || 'ทั่วไป', pointsEarned: pointsEarned
      };
      printReceipt(transaction);
      setCart([]); setShowPaymentModal(false); fetchData(); 
    } catch (err) { alert('Error: ' + err.message); } finally { setLoadingPayment(false); }
  };

  const openAddMember = () => { setMemberForm({ id: null, name: '', phone: '' }); setIsEditingMember(false); setShowMemberModal(true); };
  const openEditMember = (member) => { setMemberForm({ id: member.id, name: member.name, phone: member.phone }); setIsEditingMember(true); setShowMemberModal(true); };
  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.phone) return alert('กรอกข้อมูลให้ครบ');
    try {
        if (isEditingMember) await supabase.from('members').update({ name: memberForm.name, phone: memberForm.phone }).eq('id', memberForm.id);
        else await supabase.from('members').insert([{ name: memberForm.name, phone: memberForm.phone }]);
        setShowMemberModal(false); fetchData();
    } catch (err) { alert('บันทึกไม่สำเร็จ: ' + err.message); }
  };
  const handleDeleteMember = async (id) => {
    if (id === 1) return alert('ลบไม่ได้');
    if (!confirm('ยืนยันลบ?')) return;
    try { await supabase.from('members').delete().eq('id', id); if (selectedMember?.id === id) setSelectedMember(members.find(m => m.id === 1) || null); fetchData(); } catch (err) { alert('ลบไม่สำเร็จ'); }
  };
  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) return alert('กรอกข้อมูลให้ครบ');
    const { error } = await supabase.from('products').insert([newProduct]);
    if (!error) { setShowAddProduct(false); fetchData(); } else { alert('เพิ่มสินค้าไม่สำเร็จ'); }
  };
  const handleDeleteProduct = async (id) => { if(confirm('ยืนยันลบ?')) { await supabase.from('products').delete().eq('id', id); fetchData(); } };


  // --- 4. RENDER ---
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center font-sans px-4">
        <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-xs text-center">
          <div className={`w-16 h-16 bg-${PRIMARY_COLOR}-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg`}><Lock size={32}/></div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{SHOP_NAME}</h1>
          <p className="text-gray-500 mb-8 text-sm">กรุณาใส่รหัสพนักงาน</p>
          <div className="mb-6 flex justify-center gap-3">{[...Array(6)].map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${i < pinInput.length ? `bg-${PRIMARY_COLOR}-600` : 'bg-gray-200'}`}></div>))}</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => handleLogin(n.toString())} className="h-14 rounded-xl bg-gray-50 text-lg font-bold text-gray-700 border">{n}</button>)}
            <button onClick={() => handleLogin('clear')} className="h-14 rounded-xl bg-red-50 text-red-500 font-bold"><X /></button>
            <button onClick={() => handleLogin('0')} className="h-14 rounded-xl bg-gray-50 text-lg font-bold text-gray-700 border">0</button>
            <button onClick={() => handleLogin('enter')} className={`h-14 rounded-xl bg-${PRIMARY_COLOR}-600 text-white font-bold`}>เข้า</button>
          </div>
        </div>
      </div>
    )
  }

  // --- Views (Mobile Optimized - Compact) ---
  const POSView = () => (
    <div className="flex h-full flex-col md:flex-row overflow-hidden pb-20 md:pb-0">
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
        <header className="h-14 md:h-16 bg-white border-b px-4 flex items-center justify-between shrink-0 z-10">
          <h1 className={`text-base md:text-lg font-bold text-gray-800 flex items-center gap-2`}><Coffee className={`text-${PRIMARY_COLOR}-600`} size={18}/> <span className="hidden sm:inline">{SHOP_NAME}</span></h1>
          <div className="relative w-40 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหา..." className={`w-full pl-8 pr-3 py-1.5 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-${PRIMARY_COLOR}-500 rounded-full transition-all outline-none text-xs`} />
          </div>
        </header>
        <div className="px-3 py-2 bg-white border-b flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id ? `bg-${PRIMARY_COLOR}-600 text-white shadow-md` : 'bg-gray-100 text-gray-600'}`}>
              {cat.icon}{cat.label}
            </button>
          ))}
        </div>
        {/* Product Grid (Super Compact for Mobile) */}
        <div className="p-2 md:p-6 flex-1 overflow-y-auto pb-32 md:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className={`relative bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-between h-28 md:h-48 transition-all active:scale-95 ${p.stock <= 0 ? 'opacity-60 grayscale' : ''}`}>
                <div className={`w-8 h-8 md:w-20 md:h-20 rounded-full ${p.color || 'bg-gray-100'} flex items-center justify-center mb-1 text-gray-500`}>
                   {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover rounded-full" /> : <Coffee size={16}/>}
                </div>
                <div className="text-center w-full">
                  <h3 className="font-bold text-gray-800 text-[10px] md:text-sm leading-tight mb-0.5 line-clamp-2">{p.name}</h3>
                  <p className={`text-${PRIMARY_COLOR}-600 font-extrabold text-xs md:text-sm`}>฿{p.price}</p>
                </div>
                <div className={`absolute top-1 right-1 text-[8px] md:text-[10px] px-1 py-0.5 rounded-full font-bold ${p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {p.stock}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Cart Sidebar (PC) */}
      <aside className="hidden md:flex w-96 bg-white border-l flex-col shadow-2xl z-20 h-full">
        <CartSidebarContent selectedMember={selectedMember} members={members} setSelectedMember={setSelectedMember} cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} netTotal={netTotal} setShowPaymentModal={setShowPaymentModal} />
      </aside>

      {/* Mobile Cart Drawer */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] z-30 animate-in slide-in-from-bottom duration-300">
            <div className="p-3 flex justify-between items-center" onClick={() => setShowPaymentModal(true)}>
                <div className="flex items-center gap-3">
                    <div className={`bg-${PRIMARY_COLOR}-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold`}>{cart.reduce((acc, item) => acc + item.qty, 0)}</div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">ยอดสุทธิ</span>
                        <span className={`text-lg font-extrabold text-${PRIMARY_COLOR}-600`}>฿{netTotal.toFixed(2)}</span>
                    </div>
                </div>
                <button className={`bg-${PRIMARY_COLOR}-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md`} onClick={(e) => { e.stopPropagation(); setShowPaymentModal(true); }}>ชำระเงิน</button>
            </div>
        </div>
      )}
    </div>
  );

  const StockView = () => (
    <div className="p-4 pb-24 md:p-8 h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Package size={20}/> สต็อก</h2>
        <button onClick={() => setShowAddProduct(true)} className={`bg-${PRIMARY_COLOR}-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow`}><Plus size={16}/> เพิ่ม</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-gray-100 text-gray-600"><tr><th className="p-3">ชื่อ</th><th className="p-3 text-right">ราคา</th><th className="p-3 text-center">เหลือ</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id}><td className="p-3">{p.name}</td><td className="p-3 text-right">฿{p.price}</td><td className="p-3 text-center">{p.stock}</td><td className="p-3 text-center"><button onClick={() => handleDeleteProduct(p.id)} className="text-red-500"><Trash2 size={14}/></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const MembersView = () => (
    <div className="p-4 pb-24 md:p-8 h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users size={20}/> สมาชิก</h2>
        <button onClick={openAddMember} className={`bg-${PRIMARY_COLOR}-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow`}><UserPlus size={16}/> เพิ่ม</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {members.map(m => (
          <div key={m.id} className="bg-white p-3 rounded-xl shadow-sm border flex items-center gap-3">
            <div className={`w-8 h-8 bg-${PRIMARY_COLOR}-100 text-${PRIMARY_COLOR}-600 rounded-full flex items-center justify-center font-bold text-xs`}>{m.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-xs truncate">{m.name}</h3>
              <p className="text-gray-500 text-[10px]">{m.phone}</p>
              <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded inline-block mt-0.5">⭐ {m.points}</span>
            </div>
            {m.id !== 1 && <div className="flex gap-1"><button onClick={() => openEditMember(m)} className="text-gray-400"><Edit size={14}/></button><button onClick={() => handleDeleteMember(m.id)} className="text-red-400"><Trash2 size={14}/></button></div>}
          </div>
        ))}
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="p-4 pb-24 md:p-8 h-full overflow-y-auto bg-gray-50">
      <h2 className="text-lg font-bold text-gray-800 mb-4">ภาพรวม</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-3 rounded-xl shadow-sm border"><p className="text-gray-500 text-[10px]">ยอดขายวันนี้</p><h3 className="text-xl font-bold text-gray-800">฿{dashboardStats.sales.toLocaleString()}</h3></div>
        <div className="bg-white p-3 rounded-xl shadow-sm border"><p className="text-gray-500 text-[10px]">จำนวนบิล</p><h3 className="text-xl font-bold text-gray-800">{dashboardStats.count}</h3></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
         <div className="p-3 border-b bg-gray-50"><h3 className="font-bold text-gray-800 text-xs">ล่าสุด</h3></div>
         <table className="w-full text-left text-[10px] md:text-sm"><thead className="bg-white text-gray-500"><tr><th className="p-2">บิล</th><th className="p-2">วิธีชำระ</th><th className="p-2 text-right">บาท</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{orders.slice(0,10).map((tx, i) => (<tr key={i}><td className="p-2">{tx.id}</td><td className="p-2">{tx.payment_method}</td><td className="p-2 text-right font-bold">{tx.total.toFixed(2)}</td></tr>))}</tbody>
         </table>
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
          <NavButton icon={<Package />} label="สต็อก" active={activeTab === 'stock'} onClick={() => {setActiveTab('stock'); fetchData();}} />
          <NavButton icon={<LayoutGrid />} label="สรุป" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); fetchData();}} />
          <NavButton icon={<Users />} label="สมาชิก" active={activeTab === 'members'} onClick={() => {setActiveTab('members'); fetchData();}} />
        </nav>
        <button onClick={() => setIsLoggedIn(false)} className="p-3 text-gray-500 hover:text-red-400 transition mt-auto"><LogOut size={24} /></button>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe">
        <NavButtonMobile icon={<ShoppingCart />} label="ขาย" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
        <NavButtonMobile icon={<Package />} label="สต็อก" active={activeTab === 'stock'} onClick={() => {setActiveTab('stock'); fetchData();}} />
        <NavButtonMobile icon={<LayoutGrid />} label="สรุป" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); fetchData();}} />
        <NavButtonMobile icon={<Users />} label="สมาชิก" active={activeTab === 'members'} onClick={() => {setActiveTab('members'); fetchData();}} />
      </div>

      <main className="flex-1 h-full relative flex flex-col">
        {activeTab === 'pos' && <POSView />}
        {activeTab === 'stock' && <StockView />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'members' && <MembersView />}
      
        {/* Modals */}
        {showPaymentModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md">
               <div className="text-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-800">ชำระเงิน</h2>
                 <h1 className={`text-5xl font-extrabold text-${PRIMARY_COLOR}-600 mt-3`}>฿{netTotal.toFixed(2)}</h1>
               </div>
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <button onClick={() => setPaymentMethod('cash')} className={`py-3 rounded-xl font-bold border-2 flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? `border-${PRIMARY_COLOR}-600 bg-${PRIMARY_COLOR}-50 text-${PRIMARY_COLOR}-600` : 'border-transparent bg-gray-100'}`}><DollarSign size={20} /> เงินสด</button>
                  <button onClick={() => setPaymentMethod('qr')} className={`py-3 rounded-xl font-bold border-2 flex flex-col items-center gap-1 ${paymentMethod === 'qr' ? `border-${PRIMARY_COLOR}-600 bg-${PRIMARY_COLOR}-50 text-${PRIMARY_COLOR}-600` : 'border-transparent bg-gray-100'}`}><QrCode size={20} /> QR Code</button>
               </div>
               {paymentMethod === 'qr' && (
                 <div className="flex justify-center py-4 bg-blue-50 rounded-2xl mb-6"><div className="bg-white p-2 rounded-xl shadow-sm"><img src={`https://promptpay.io/${SHOP_PROMPTPAY_ID}/${netTotal}`} className="w-40 h-40 mix-blend-multiply" alt="QR"/></div></div>
               )}
               <div className="flex gap-4">
                 <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
                 <button onClick={confirmPayment} disabled={loadingPayment} className={`flex-1 py-3 bg-${PRIMARY_COLOR}-600 text-white rounded-xl font-bold shadow-lg flex justify-center items-center gap-2`}>{loadingPayment ? <Loader2 className="animate-spin"/> : 'ยืนยัน'}</button>
               </div>
            </div>
          </div>
        )}

        {/* Product/Member Modals */}
        {showAddProduct && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">เพิ่มสินค้า</h3>
              <div className="space-y-3">
                <input placeholder="ชื่อสินค้า" className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <input type="number" placeholder="ราคา" className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                <input type="number" placeholder="สต็อก" className="w-full border p-2 rounded" onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
              </div>
              <div className="flex gap-2 mt-6"><button onClick={() => setShowAddProduct(false)} className="flex-1 py-2 text-gray-500">ยกเลิก</button><button onClick={handleAddProduct} className={`flex-1 py-2 bg-${PRIMARY_COLOR}-600 text-white rounded`}>บันทึก</button></div>
            </div>
          </div>
        )}

        {showMemberModal && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">{isEditingMember ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก'}</h3>
              <div className="space-y-3">
                <input placeholder="ชื่อ" className="w-full border p-2 rounded" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} />
                <input placeholder="เบอร์โทร" className="w-full border p-2 rounded" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-6"><button onClick={() => setShowMemberModal(false)} className="flex-1 py-2 text-gray-500">ยกเลิก</button><button onClick={handleSaveMember} className={`flex-1 py-2 bg-${PRIMARY_COLOR}-600 text-white rounded`}>บันทึก</button></div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const CartSidebarContent = ({ selectedMember, members, setSelectedMember, cart, updateQty, removeFromCart, netTotal, setShowPaymentModal }) => (
    <>
        <div className={`p-4 border-b bg-${PRIMARY_COLOR}-50/50`}>
           <div className="flex items-center justify-between mb-2">
             <span className={`text-xs font-bold text-${PRIMARY_COLOR}-900 uppercase flex items-center gap-1`}><Users size={14}/> ลูกค้า</span>
             <select className="text-xs bg-white border rounded px-2 py-1 outline-none max-w-[150px]" value={selectedMember?.id || ''} onChange={(e) => setSelectedMember(members.find(m => m.id == e.target.value))}>
                {members.length === 0 && <option>กำลังโหลด...</option>}
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
             </select>
           </div>
           <div className={`flex items-center gap-3 bg-white p-3 rounded-xl border border-${PRIMARY_COLOR}-100 shadow-sm`}>
             <div className={`w-10 h-10 bg-gradient-to-br from-${PRIMARY_COLOR}-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow font-bold`}>
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
              <div key={item.id} className={`flex items-center gap-3 p-2 bg-white border border-gray-100 hover:border-${PRIMARY_COLOR}-300 rounded-xl transition-all shadow-sm`}>
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
        <div className="p-4 bg-white border-t shadow-lg z-10">
          <div className="flex justify-between text-xl font-bold text-gray-800 mb-3"><span>สุทธิ</span><span className={`text-${PRIMARY_COLOR}-600`}>฿{netTotal.toFixed(2)}</span></div>
          <button onClick={() => cart.length > 0 && setShowPaymentModal(true)} disabled={cart.length === 0} className={`w-full py-3 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 group ${cart.length > 0 ? `bg-${PRIMARY_COLOR}-600 text-white hover:bg-${PRIMARY_COLOR}-700` : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            <span>ชำระเงิน</span>
          </button>
        </div>
    </>
);

const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl transition-all duration-200 relative group p-3 w-20 ${active ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}>
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : ''}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const NavButtonMobile = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center p-2 rounded-lg transition-all ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
    {React.cloneElement(icon, { size: 20 })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);