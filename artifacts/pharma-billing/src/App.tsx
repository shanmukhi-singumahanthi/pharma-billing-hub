import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getListProductsQueryKey,
  getListSalesQueryKey,
  useCreateSale,
  useListProducts,
  useListSales,
  useUpdateProduct,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BarChart3, Bell,
  ChevronDown, ChevronRight, CircleCheck, CreditCard,
  Download, Edit3, FileText, LayoutDashboard, Menu, Minus, Package, Plus,
  Printer, Receipt, Search, Settings, ShoppingCart, SlidersHorizontal,
  Sparkles, Store, Trash2, TrendingUp, UserRound, Users, WalletCards, X,
  type LucideIcon,
} from 'lucide-react';
import { Router as WouterRouter, Route, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

type View = 'overview' | 'billing' | 'products' | 'sales' | 'settings';
type PaymentMethod = 'Cash' | 'UPI' | 'Card';
type Product = { id: number; name: string; generic: string; category: string; unit: string; price: number; stock: number; reorder: number; accent: string };
type CartItem = { product: Product; quantity: number };
type SaleLine = { name: string; quantity: number; unitPrice: number; lineTotal: number };
type Sale = { id: string; customer: string; items: string; lines: SaleLine[]; amount: number; method: PaymentMethod; time: string; status: 'Paid' };

const COMPANY_NAME = 'Vestas Pharmaceuticals';
const COMPANY_PHONE = '+91 98765 43210';
const COMPANY_ADDRESS = '14, Lake View Road, Pune 411001';
const OWNER_NAME = 'Satyendranath S';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const today = 'Tuesday, 21 June 2024';

type ApiSale = {
  id: number;
  billNumber: string;
  customer: string;
  lines: Array<{ productId: number; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  amount: number;
  method: PaymentMethod;
  status: 'Paid';
  createdAt: string;
};

function mapSale(sale: ApiSale): Sale {
  return {
    id: sale.billNumber,
    customer: sale.customer,
    items: sale.lines.map((line) => `${line.name}${line.quantity > 1 ? ` ×${line.quantity}` : ''}`).join(', '),
    lines: sale.lines.map(({ name, quantity, unitPrice, lineTotal }) => ({ name, quantity, unitPrice, lineTotal })),
    amount: sale.amount,
    method: sale.method,
    time: new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    status: sale.status,
  };
}

const navItems: { id: View; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Your day at a glance' },
  { id: 'billing', label: 'New bill', icon: Receipt, hint: 'Create a sale' },
  { id: 'products', label: 'Products & stock', icon: Package, hint: 'Keep shelves ready' },
  { id: 'sales', label: 'Sales history', icon: BarChart3, hint: 'Review completed bills' },
];

function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return <button type="button" aria-label={label} data-testid={`button-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={onClick} className={`inline-flex items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 ${className}`}>{children}</button>;
}

function Sidebar({ active, onChange, mobileOpen, closeMobile }: { active: View; onChange: (view: View) => void; mobileOpen: boolean; closeMobile: () => void }) {
  return <aside className={`app-sidebar sidebar-grain fixed inset-y-0 left-0 z-40 flex w-[254px] flex-col border-r border-white/10 px-4 py-5 transition-transform duration-300 md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex items-center gap-3 px-2">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e9ae79] text-[#1f4d4b] shadow-lg shadow-black/10"><CrossMark /></div>
       <div><p className="font-display text-[17px] font-extrabold tracking-tight">Vestas</p><p className="text-[10px] uppercase tracking-[.18em] text-white/50">Pharmaceuticals · Billing</p></div>
      <IconButton label="close menu" onClick={closeMobile} className="ml-auto size-8 text-white/60 hover:bg-white/10 md:hidden"><X size={17} /></IconButton>
    </div>
    <div className="mt-10 px-2"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/40">Workspace</p>
      <nav className="space-y-1">
        {navItems.map(({ id, label, icon: Icon, hint }) => <button type="button" key={id} data-testid={`nav-${id}`} onClick={() => { onChange(id); closeMobile(); }} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${active === id ? 'bg-white/12 text-white shadow-inner' : 'text-white/66 hover:bg-white/7 hover:text-white'}`}>
          <span className={`flex size-9 items-center justify-center rounded-xl transition-colors ${active === id ? 'bg-[#e9ae79] text-[#244d4b]' : 'bg-white/7 text-white/65 group-hover:bg-white/12'}`}><Icon size={18} strokeWidth={1.8} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block truncate text-[10px] text-white/40">{hint}</span></span>
          {active === id && <span className="size-1.5 rounded-full bg-[#e9ae79]" />}
        </button>)}
      </nav>
    </div>
    <div className="mt-auto space-y-3">
      <button type="button" data-testid="nav-settings" onClick={() => { onChange('settings'); closeMobile(); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-all ${active === 'settings' ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/7 hover:text-white'}`}><span className="flex size-9 items-center justify-center rounded-xl bg-white/7"><Settings size={18} strokeWidth={1.8} /></span>Settings</button>
       <div className="rounded-2xl border border-white/10 bg-white/7 p-3"><div className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-full bg-[#e9ae79] text-xs font-bold text-[#244d4b]">SS</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{OWNER_NAME}</p><p className="truncate text-[10px] text-white/45">Owner · {COMPANY_NAME}</p></div><ChevronDown size={14} className="text-white/40" /></div></div>
       <p className="px-2 text-[10px] leading-4 text-white/35">Vestas Billing · Your pharmacy counter, made simpler.</p>
    </div>
  </aside>;
}

function CrossMark() {
  return <div className="relative flex size-6 items-center justify-center"><span className="absolute h-5 w-1.5 rounded-full bg-current" /><span className="absolute h-1.5 w-5 rounded-full bg-current" /></div>;
}

function Topbar({ active, onMenu, onNewBill, onNotify }: { active: View; onMenu: () => void; onNewBill: () => void; onNotify: () => void }) {
  const title = active === 'overview' ? `Good morning, ${OWNER_NAME}` : active === 'billing' ? 'Create a new bill' : active === 'products' ? 'Products & stock' : active === 'sales' ? 'Sales history' : 'Business settings';
  const subtitle = active === 'overview' ? `Here is how ${COMPANY_NAME} is doing today.` : active === 'billing' ? 'Serve the next customer with confidence.' : active === 'products' ? 'Prices, quantities, and reorder signals in one place.' : active === 'sales' ? 'A clear record of every completed sale.' : 'Keep your pharmacy details up to date.';
  return <header className="mb-7 flex items-start justify-between gap-4"><div className="flex items-start gap-3"><IconButton label="open menu" onClick={onMenu} className="mt-0.5 size-10 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] md:hidden"><Menu size={19} /></IconButton><div><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span>{today}</span><span className="size-1 rounded-full bg-[hsl(var(--secondary))]" /><span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#67a889]" /> Store open</span></div><h1 data-testid="text-page-title" className="font-display text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-.04em] text-[hsl(var(--foreground))]">{title}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</p></div></div><div className="flex shrink-0 items-center gap-2"><IconButton label="notifications" onClick={onNotify} className="size-10 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><Bell size={18} strokeWidth={1.8} /></IconButton><button type="button" data-testid="button-header-new-bill" onClick={onNewBill} className="hidden items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:flex"><Plus size={17} /> New bill</button></div></header>;
}

function StatCard({ label, value, detail, icon: Icon, trend, warm = false }: { label: string; value: string; detail: string; icon: LucideIcon; trend?: 'up' | 'down'; warm?: boolean }) {
  return <div className={`rise-in rounded-2xl border p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card ${warm ? 'border-[#e3b17f]/30 bg-[#fff4e6]' : 'border-[hsl(var(--card-border))] bg-[hsl(var(--card))]'}`}><div className="flex items-start justify-between"><span className={`flex size-9 items-center justify-center rounded-xl ${warm ? 'bg-[#f4d0a7] text-[#7d542f]' : 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'}`}><Icon size={18} strokeWidth={1.8} /></span>{trend && <span className={`flex items-center gap-0.5 text-[11px] font-bold ${trend === 'up' ? 'text-[#3f906e]' : 'text-[#cf6b58]'}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trend === 'up' ? '12.8%' : '3.4%'}</span>}</div><p className="mt-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</p><p data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`} className="mt-1 font-display text-2xl font-extrabold tracking-[-.04em]">{value}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function Overview({ products, sales, onNavigate }: { products: Product[]; sales: Sale[]; onNavigate: (view: View) => void }) {
  const lowStock = products.filter((p) => p.stock <= p.reorder);
  return <div className="page-in space-y-6">
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="Sales today" value={money(18430)} detail="vs. ₹16,340 yesterday" icon={WalletCards} trend="up" warm />
      <StatCard label="Bills created" value="27" detail="4 more than yesterday" icon={Receipt} trend="up" />
      <StatCard label="Items sold" value="81" detail="Across 44 products" icon={ShoppingCart} trend="up" />
      <StatCard label="Low stock" value={`${lowStock.length} items`} detail="Need your attention" icon={AlertTriangle} trend="down" />
    </section>
    <section className="grid gap-6 xl:grid-cols-[1.38fr_.92fr]">
      <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Sales rhythm</p><h2 className="mt-1 font-display text-lg font-extrabold">This week at a glance</h2></div><div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--accent))] px-2.5 py-1.5 text-xs font-bold text-[hsl(var(--primary))]"><TrendingUp size={14} /> +12.8%</div></div>
        <div className="mt-7 flex h-[185px] items-end gap-2 sm:gap-4">{[{ d: 'Mon', v: 64, amount: '₹14.2k' }, { d: 'Tue', v: 78, amount: '₹17.3k' }, { d: 'Wed', v: 58, amount: '₹12.8k' }, { d: 'Thu', v: 85, amount: '₹18.6k' }, { d: 'Fri', v: 73, amount: '₹16.1k' }, { d: 'Sat', v: 93, amount: '₹20.5k' }, { d: 'Today', v: 71, amount: '₹18.4k' }].map((bar, index) => <div key={bar.d} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100">{bar.amount}</span><div className={`w-full max-w-[38px] rounded-t-lg transition-all duration-500 group-hover:brightness-95 ${index === 6 ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--accent))]'}`} style={{ height: `${bar.v}%` }} /><span className={`text-[10px] font-semibold ${index === 6 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{bar.d}</span></div>)}</div>
        <div className="mt-4 flex items-center gap-4 border-t border-[hsl(var(--border))] pt-4 text-[11px] text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[hsl(var(--accent))]" /> Previous days</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[hsl(var(--secondary))]" /> Today</span></div>
      </div>
      <div className="rounded-2xl border border-[#e5bb8f]/45 bg-[#fff6e9] p-5 shadow-soft sm:p-6"><div className="flex items-start justify-between"><div><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#9c6b42]"><AlertTriangle size={14} /> Stock attention</p><h2 className="mt-1 font-display text-lg font-extrabold text-[#284d4b]">Before the next rush</h2></div><span className="rounded-full bg-[#f3d5af] px-2 py-1 text-[10px] font-bold text-[#875e3b]">{lowStock.length} to review</span></div><div className="mt-4 divide-y divide-[#e5bb8f]/35">{lowStock.slice(0, 4).map((p) => <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><ProductTile accent={p.accent} small /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#284d4b]">{p.name}</p><p className="text-[11px] text-[#9b7555]">{p.stock} left · Reorder at {p.reorder}</p></div><button type="button" data-testid={`button-restock-${p.id}`} onClick={() => onNavigate('products')} className="rounded-lg border border-[#d8b486] bg-[#fffaf2] px-2 py-1.5 text-[10px] font-bold text-[#865d3b] transition-colors hover:bg-[#f9e7cd]">Review</button></div>)}</div><button type="button" data-testid="button-view-all-stock" onClick={() => onNavigate('products')} className="mt-4 flex items-center gap-1 text-xs font-bold text-[#567a72] hover:text-[#284d4b]">View all stock <ChevronRight size={14} /></button></div>
    </section>
    <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-soft"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Recent bills</p><h2 className="mt-1 font-display text-lg font-extrabold">Latest from the counter</h2></div><button type="button" data-testid="button-view-sales" onClick={() => onNavigate('sales')} className="text-xs font-bold text-[hsl(var(--primary))] hover:underline">View all</button></div><div className="mt-4 divide-y divide-[hsl(var(--border))]">{sales.slice(0, 4).map((sale) => <SaleRow key={sale.id} sale={sale} />)}</div></div>
      <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-soft"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Best movers</p><h2 className="mt-1 font-display text-lg font-extrabold">Moving off the shelf</h2></div><Package size={19} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-5 space-y-4">{[{ name: 'Dolo 650', units: 24, share: 84 }, { name: 'Azithral 500', units: 17, share: 66 }, { name: 'Shelcal 500', units: 13, share: 49 }, { name: 'Pantocid 40', units: 9, share: 36 }].map((p, i) => <div key={p.name} className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--primary))]">0{i + 1}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-xs"><span className="truncate font-bold">{p.name}</span><span className="shrink-0 text-[hsl(var(--muted-foreground))]">{p.units} units</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${p.share}%` }} /></div></div></div>)}</div></div>
    </section>
  </div>;
}

function ProductTile({ accent, small = false }: { accent: string; small?: boolean }) {
  const styles: Record<string, string> = { coral: 'bg-[#f6d7c6] text-[#a65d4b]', teal: 'bg-[#cce6df] text-[#307469]', gold: 'bg-[#f1e2ae] text-[#8e702c]', lilac: 'bg-[#ded9ed] text-[#6e6297]', sky: 'bg-[#d2e6e9] text-[#4e7e86]' };
  return <span className={`flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold ${small ? 'size-9 text-[10px]' : 'size-12 text-xs'} ${styles[accent] || styles.teal}`}>Rx</span>;
}

function SaleRow({ sale }: { sale: Sale }) {
  return <div data-testid={`row-sale-${sale.id}`} className="flex items-center gap-3 py-3.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><Receipt size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{sale.customer}</p><p className="mt-0.5 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{sale.id} · {sale.items}</p></div><div className="text-right"><p className="text-sm font-extrabold">{money(sale.amount)}</p><p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">{sale.time}</p></div></div>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);
}

function downloadSoftCopy(sale: Sale) {
  const rows = sale.lines.map((line) => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${money(line.unitPrice)}</td><td>${money(line.lineTotal)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sale.id)} · ${escapeHtml(COMPANY_NAME)}</title><style>body{font-family:Arial,sans-serif;color:#173c3b;max-width:720px;margin:48px auto;padding:0 24px}header{border-bottom:2px solid #2f776e;padding-bottom:18px;margin-bottom:26px}h1{margin:0 0 4px;font-size:26px}p{margin:4px 0;color:#55716d;font-size:13px}.meta{display:flex;justify-content:space-between;gap:24px;margin:20px 0 28px}.meta strong{display:block;color:#173c3b;margin-bottom:4px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid #dfebe5}th{color:#55716d;font-size:11px;text-transform:uppercase;letter-spacing:.08em}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.total{display:flex;justify-content:flex-end;gap:28px;font-size:18px;font-weight:700;margin-top:22px}.footer{border-top:1px solid #dfebe5;margin-top:40px;padding-top:16px;font-size:12px}</style></head><body><header><h1>${escapeHtml(COMPANY_NAME)}</h1><p>${escapeHtml(COMPANY_ADDRESS)} · ${escapeHtml(COMPANY_PHONE)}</p><p>Digital bill · Payment received via ${escapeHtml(sale.method)}</p></header><div class="meta"><div><strong>Bill number</strong>${escapeHtml(sale.id)}</div><div><strong>Customer</strong>${escapeHtml(sale.customer)}</div><div><strong>Time</strong>${escapeHtml(sale.time)}</div></div><table><thead><tr><th>Medicine</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><span>Total</span><span>${money(sale.amount)}</span></div><div class="footer">Thank you for choosing ${escapeHtml(COMPANY_NAME)}. Please keep this bill for your records.</div></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${sale.id}-soft-copy.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReceiptModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [downloaded, setDownloaded] = useState(false);
  const download = () => {
    downloadSoftCopy(sale);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2500);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173c3b]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Bill ${sale.id}`}>
    <div className="receipt-print-sheet max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-3xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-2xl sm:p-8">
      <div className="receipt-actions mb-5 flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Bill ready</p><h2 className="mt-1 font-display text-xl font-extrabold">Choose a copy</h2></div>
        <button type="button" aria-label="close bill" data-testid="button-close-receipt" onClick={onClose} className="receipt-close flex size-9 items-center justify-center rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
      </div>
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 sm:p-7">
        <div className="border-b-2 border-[hsl(var(--primary))] pb-5 text-center"><p className="font-display text-2xl font-extrabold tracking-tight text-[hsl(var(--primary))]">{COMPANY_NAME}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{COMPANY_ADDRESS}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{COMPANY_PHONE}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Tax invoice / cash memo</p></div>
        <div className="grid grid-cols-2 gap-4 border-b border-[hsl(var(--border))] py-5 text-xs sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Bill number</p><p className="mt-1 font-bold">{sale.id}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Customer</p><p className="mt-1 font-bold">{sale.customer}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Payment</p><p className="mt-1 font-bold">{sale.method}</p></div></div>
        <div className="divide-y divide-[hsl(var(--border))]">{sale.lines.map((line) => <div key={line.name} className="grid grid-cols-[1fr_auto_auto] gap-3 py-3 text-sm"><div className="min-w-0"><p className="truncate font-semibold">{line.name}</p><p className="text-[11px] text-[hsl(var(--muted-foreground))]">{money(line.unitPrice)} each</p></div><span className="text-[hsl(var(--muted-foreground))]">×{line.quantity}</span><span className="text-right font-bold">{money(line.lineTotal)}</span></div>)}</div>
        <div className="mt-5 flex items-center justify-between border-t-2 border-[hsl(var(--foreground)/.15)] pt-4"><span className="font-bold">Total paid</span><span className="font-display text-2xl font-extrabold text-[hsl(var(--primary))]">{money(sale.amount)}</span></div>
        <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">Thank you for choosing {COMPANY_NAME}.</p>
      </div>
      <div className="receipt-actions mt-5 grid gap-3 sm:grid-cols-2"><button type="button" data-testid="button-download-soft-copy" onClick={download} className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--accent))]"><Download size={17} />{downloaded ? 'Soft copy downloaded' : 'Download soft copy'}</button><button type="button" data-testid="button-print-hard-copy" onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-all hover:-translate-y-0.5 hover:shadow-md"><Printer size={17} /> Print hard copy</button></div>
      <p className="receipt-actions mt-3 text-center text-[11px] text-[hsl(var(--muted-foreground))]">The digital copy downloads to this device. Printing opens a paper-ready layout.</p>
    </div>
  </div>;
}

function SearchBox({ value, onChange, placeholder, testId }: { value: string; onChange: (value: string) => void; placeholder: string; testId: string }) {
  return <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2.5 shadow-soft focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/.12)]"><Search size={17} className="shrink-0 text-[hsl(var(--muted-foreground))]" /><input data-testid={testId} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]" /></label>;
}

function Billing({ products, cart, setCart, onComplete, submitting }: { products: Product[]; cart: CartItem[]; setCart: (cart: CartItem[]) => void; onComplete: (customer: string, payment: PaymentMethod) => void; submitting: boolean }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [customer, setCustomer] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const categories = ['All', 'Pain relief', 'Antibiotic', 'Vitamins', 'Wellness', 'Digestive'];
  const visible = products.filter((p) => (category === 'All' || p.category === category) && `${p.name} ${p.generic}`.toLowerCase().includes(query.toLowerCase()));
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const addItem = (product: Product) => { if (product.stock < 1) return; const existing = cart.find((item) => item.product.id === product.id); if (existing) setCart(cart.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item)); else setCart([...cart, { product, quantity: 1 }]); };
  const adjust = (id: number, amount: number) => setCart(cart.map((item) => item.product.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));
  return <div className="page-in grid items-start gap-6 xl:grid-cols-[1.18fr_.82fr]">
    <section className="min-w-0"><div className="mb-4 flex items-center gap-2"><SearchBox value={query} onChange={setQuery} placeholder="Search by name or generic medicine..." testId="input-billing-search" /><IconButton label="filter products" onClick={() => setCategory('All')} className="size-11 shrink-0 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]"><SlidersHorizontal size={17} /></IconButton></div><div className="mb-5 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button type="button" key={item} data-testid={`filter-category-${item.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${category === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]'}`}>{item}</button>)}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{visible.map((product) => <button type="button" key={product.id} data-testid={`card-billing-product-${product.id}`} disabled={product.stock === 0} onClick={() => addItem(product)} className="group rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.45)] hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"><div className="flex items-start justify-between"><ProductTile accent={product.accent} /><span className="rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">{product.stock} left</span></div><p className="mt-3 truncate text-sm font-bold">{product.name}</p><p className="mt-0.5 truncate text-[10px] text-[hsl(var(--muted-foreground))]">{product.generic}</p><div className="mt-3 flex items-center justify-between"><span className="font-display text-sm font-extrabold">{money(product.price)}</span><span className="flex size-7 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] opacity-80 transition-opacity group-hover:opacity-100"><Plus size={15} /></span></div></button>)}</div>{visible.length === 0 && <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-6 py-12 text-center"><Package className="mx-auto text-[hsl(var(--muted-foreground))]" /><p className="mt-3 text-sm font-bold">No medicines found</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Try a different name or category.</p></div>}</section>
     <section className="sticky top-5 rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-card"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Current bill</p><h2 className="mt-1 font-display text-xl font-extrabold">New sale <span className="ml-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">Saved when completed</span></h2></div><IconButton label="clear bill" onClick={() => setCart([])} className="size-8 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Trash2 size={16} /></IconButton></div><div className="max-h-[285px] overflow-y-auto p-5">{cart.length === 0 ? <div className="py-10 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><ShoppingCart size={24} /></div><p className="mt-3 text-sm font-bold">Your bill is ready</p><p className="mx-auto mt-1 max-w-[210px] text-xs leading-5 text-[hsl(var(--muted-foreground))]">Select medicines from the left to add them to this bill.</p></div> : <div className="space-y-4">{cart.map((item) => <div key={item.product.id} className="flex items-center gap-3" data-testid={`row-cart-${item.product.id}`}><ProductTile accent={item.product.accent} small /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{item.product.name}</p><p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{money(item.product.price)} each</p></div><div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] p-0.5"><IconButton label={`decrease ${item.product.name}`} onClick={() => adjust(item.product.id, -1)} className="size-6 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><Minus size={12} /></IconButton><span className="w-5 text-center text-xs font-bold">{item.quantity}</span><IconButton label={`increase ${item.product.name}`} onClick={() => adjust(item.product.id, 1)} className="size-6 text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]"><Plus size={12} /></IconButton></div><span className="w-14 text-right text-xs font-extrabold">{money(item.product.price * item.quantity)}</span></div>)}</div>}</div><div className="border-t border-[hsl(var(--border))] p-5"><label className="mb-4 block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Customer <span className="font-normal normal-case tracking-normal">(optional)</span></span><div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5 focus-within:border-[hsl(var(--primary))]"><UserRound size={16} className="text-[hsl(var(--muted-foreground))]" /><input data-testid="input-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in customer" className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]" /></div></label><div className="mb-5"><p className="mb-2 text-[11px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Payment method</p><div className="grid grid-cols-3 gap-2">{(['Cash', 'UPI', 'Card'] as PaymentMethod[]).map((method) => <button type="button" key={method} data-testid={`button-payment-${method.toLowerCase()}`} onClick={() => setPayment(method)} className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors ${payment === method ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`}>{method === 'Cash' ? <Banknote size={15} /> : method === 'UPI' ? <WalletCards size={15} /> : <CreditCard size={15} />}{method}</button>)}</div></div><div className="mb-4 flex items-end justify-between"><span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">Total amount</span><span data-testid="text-bill-total" className="font-display text-2xl font-extrabold tracking-[-.04em]">{money(total)}</span></div><button type="button" data-testid="button-complete-sale" disabled={cart.length === 0 || submitting} onClick={() => onComplete(customer || 'Walk-in customer', payment)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"><CircleCheck size={18} /> {submitting ? 'Saving bill…' : 'Complete sale'}</button></div></section>
  </div>;
}

function Products({ products, onUpdate }: { products: Product[]; onUpdate: (id: number, update: { price: number; stock: number }) => void }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ price: '', stock: '' });
  const filtered = products.filter((p) => `${p.name} ${p.generic} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  const startEdit = (product: Product) => { setEditing(product.id); setDraft({ price: String(product.price), stock: String(product.stock) }); };
  const save = (id: number) => { onUpdate(id, { price: Math.max(0, Number(draft.price) || 0), stock: Math.max(0, Number(draft.stock) || 0) }); setEditing(null); };
  return <div className="page-in space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SearchBox value={query} onChange={setQuery} placeholder="Search products, generic names..." testId="input-products-search" /><div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><span className="flex size-2 rounded-full bg-[#e6a15e]" /> {products.filter((p) => p.stock <= p.reorder).length} products need restocking</div></div><div className="overflow-hidden rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-soft"><div className="hidden grid-cols-[1.7fr_1fr_.7fr_.7fr_110px] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.42)] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] sm:grid"><span>Product</span><span>Category</span><span>Price</span><span>In stock</span><span /></div><div className="divide-y divide-[hsl(var(--border))]">{filtered.map((product) => { const low = product.stock <= product.reorder; const isEditing = editing === product.id; return <div key={product.id} data-testid={`row-product-${product.id}`} className={`grid gap-3 px-4 py-4 transition-colors hover:bg-[hsl(var(--muted)/.25)] sm:grid-cols-[1.7fr_1fr_.7fr_.7fr_110px] sm:items-center sm:gap-4 sm:px-5 ${low ? 'bg-[#fffaf1]' : ''}`}><div className="flex min-w-0 items-center gap-3"><ProductTile accent={product.accent} small /><div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{product.generic} · {product.unit}</p></div></div><div className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:block">{product.category}</div>{isEditing ? <input data-testid={`input-price-${product.id}`} type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="w-full rounded-lg border border-[hsl(var(--primary))] bg-transparent px-2 py-1.5 text-sm font-bold outline-none" /> : <span className="text-sm font-extrabold">{money(product.price)}</span>}{isEditing ? <input data-testid={`input-stock-${product.id}`} type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} className="w-full rounded-lg border border-[hsl(var(--primary))] bg-transparent px-2 py-1.5 text-sm font-bold outline-none" /> : <span className={`flex items-center gap-1 text-sm font-bold ${low ? 'text-[#c66d45]' : ''}`}><span className={`size-1.5 rounded-full ${low ? 'bg-[#dc895c]' : 'bg-[#66a989]'}`} />{product.stock} <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">units</span></span>}<div className="flex justify-end gap-1 sm:justify-start">{isEditing ? <><button type="button" data-testid={`button-save-product-${product.id}`} onClick={() => save(product.id)} className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1.5 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">Save</button><button type="button" data-testid={`button-cancel-product-${product.id}`} onClick={() => setEditing(null)} className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">Cancel</button></> : <button type="button" data-testid={`button-edit-product-${product.id}`} onClick={() => startEdit(product)} className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"><Edit3 size={13} /> Edit</button>}</div></div> })}</div>{filtered.length === 0 && <div className="px-6 py-14 text-center"><Package className="mx-auto text-[hsl(var(--muted-foreground))]" /><p className="mt-3 text-sm font-bold">No products match that search</p></div>}</div><p className="text-xs text-[hsl(var(--muted-foreground))]">Tip: Review low-stock items before the evening rush. Changes save instantly on this device.</p></div>;
}

function Sales({ sales, onOpenReceipt }: { sales: Sale[]; onOpenReceipt: (sale: Sale) => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = sales.filter((sale) => `${sale.id} ${sale.customer} ${sale.items}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-in space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SearchBox value={query} onChange={setQuery} placeholder="Search by bill number or customer..." testId="input-sales-search" /><button type="button" data-testid="button-sales-filter" onClick={() => setQuery('')} className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><SlidersHorizontal size={16} /> Clear search</button></div><div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-soft"><div className="border-b border-[hsl(var(--border))] px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Completed bills</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{filtered.length} results · All payments settled</p></div><div className="divide-y divide-[hsl(var(--border))]">{filtered.map((sale) => <div key={sale.id}><button type="button" data-testid={`button-sale-detail-${sale.id}`} onClick={() => setSelected(selected === sale.id ? null : sale.id)} className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[hsl(var(--muted)/.32)] sm:grid-cols-[1.25fr_1.4fr_.7fr_.7fr_24px] sm:items-center"><div><p className="text-sm font-bold">{sale.id}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{sale.time}</p></div><div><p className="text-sm font-semibold">{sale.customer}</p><p className="mt-1 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{sale.items}</p></div><div><span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-bold text-[hsl(var(--primary))]"><CircleCheck size={12} /> {sale.status}</span></div><div className="text-left sm:text-right"><p className="text-sm font-extrabold">{money(sale.amount)}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{sale.method}</p></div><ChevronDown size={16} className={`text-[hsl(var(--muted-foreground))] transition-transform ${selected === sale.id ? 'rotate-180' : ''}`} /></button>{selected === sale.id && <div className="mx-5 mb-4 rounded-xl bg-[hsl(var(--muted)/.42)] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]"><div className="flex flex-wrap justify-between gap-2"><span>Bill recorded for {COMPANY_NAME}</span><span className="font-bold text-[hsl(var(--foreground))]">Payment via {sale.method}</span></div><p className="mt-2">This receipt is complete and included in today's sales total.</p><button type="button" data-testid={`button-open-receipt-${sale.id}`} onClick={() => onOpenReceipt(sale)} className="mt-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-[11px] font-bold text-[hsl(var(--primary-foreground))]"><FileText size={14} /> Open bill copies</button></div>}</div>)}</div>{filtered.length === 0 && <div className="px-6 py-14 text-center"><FileText className="mx-auto text-[hsl(var(--muted-foreground))]" /><p className="mt-3 text-sm font-bold">No bills found</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Try the bill number or customer name.</p></div>}</div></div>;
}

function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [business, setBusiness] = useState({ name: COMPANY_NAME, phone: COMPANY_PHONE, address: COMPANY_ADDRESS, gst: '27AABFS2184G1ZQ' });
  const [receiptNote, setReceiptNote] = useState('Thank you for choosing your neighbourhood pharmacy.');
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <div className="page-in grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-soft sm:p-6"><div className="border-b border-[hsl(var(--border))] pb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Business profile</p><h2 className="mt-1 font-display text-xl font-extrabold">The details on your bills</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">These details help customers recognise your pharmacy.</p></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><SettingField label="Business name" value={business.name} onChange={(v) => setBusiness({ ...business, name: v })} id="business-name" /><SettingField label="Phone number" value={business.phone} onChange={(v) => setBusiness({ ...business, phone: v })} id="business-phone" /><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Business address</span><textarea data-testid="input-business-address" value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} rows={2} className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]" /></label><SettingField label="GSTIN (optional)" value={business.gst} onChange={(v) => setBusiness({ ...business, gst: v })} id="business-gst" /></div><div className="mt-7 border-t border-[hsl(var(--border))] pt-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Receipt note</p><textarea data-testid="input-receipt-note" value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} rows={2} className="mt-3 w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]" /><button type="button" data-testid="button-save-settings" onClick={save} className="mt-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-all hover:-translate-y-0.5">{saved ? <CircleCheck size={17} /> : <Store size={17} />}{saved ? 'Saved to this device' : 'Save changes'}</button></div></section><section className="space-y-6"><div className="rounded-2xl border border-[#d2e6df] bg-[#edf7f3] p-5 shadow-soft sm:p-6"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#cce6df] text-[#307469]"><Sparkles size={21} /></div><h2 className="mt-5 font-display text-lg font-extrabold text-[#284d4b]">Made for the busy moments</h2><p className="mt-2 text-sm leading-6 text-[#587a73]">{COMPANY_NAME} keeps the essentials close: quick bills, honest stock counts, and a calm view of your day.</p><div className="mt-5 space-y-3 text-xs font-semibold text-[#52756d]"><p className="flex items-center gap-2"><CircleCheck size={15} /> Every bill has a digital copy</p><p className="flex items-center gap-2"><CircleCheck size={15} /> Print a paper copy at the counter</p><p className="flex items-center gap-2"><CircleCheck size={15} /> Prices update instantly in billing</p></div></div><div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-soft sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Your plan</p><div className="mt-3 flex items-end justify-between"><div><p className="font-display text-lg font-extrabold">Vestas Billing</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Everything you need at the counter</p></div><span className="rounded-full bg-[hsl(var(--accent))] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">Active</span></div></div></section></div>;
}

function SettingField({ label, value, onChange, id }: { label: string; value: string; onChange: (value: string) => void; id: string }) {
  return <label><span className="mb-1.5 block text-xs font-bold">{label}</span><input data-testid={`input-${id}`} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]" /></label>;
}

function AppShell() {
  const [active, setActive] = useState<View>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState('');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const queryClient = useQueryClient();
  const productsQuery = useListProducts();
  const salesQuery = useListSales();
  const createSaleMutation = useCreateSale();
  const updateProductMutation = useUpdateProduct();
  const products = (productsQuery.data ?? []) as Product[];
  const sales = (salesQuery.data ?? []).map((sale) => mapSale(sale as ApiSale));
  const go = (view: View) => { setActive(view); setMobileOpen(false); };
  const updateProduct = (id: number, update: { price: number; stock: number }) => {
    updateProductMutation.mutate({ id, data: update }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setNotice('Product price and stock saved');
        window.setTimeout(() => setNotice(''), 3000);
      },
      onError: () => setNotice('Could not save this product. Please try again.'),
    });
  };
  const completeSale = (customer: string, payment: PaymentMethod) => {
    createSaleMutation.mutate({
      data: {
        customer,
        method: payment,
        lines: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      },
    }, {
      onSuccess: (savedSale) => {
        const completedSale = mapSale(savedSale as ApiSale);
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        setCart([]);
        setNotice(`Sale completed · ${money(completedSale.amount)} collected via ${payment}`);
        setActive('sales');
        setReceiptSale(completedSale);
        window.setTimeout(() => setNotice(''), 4500);
      },
      onError: (error) => setNotice(error instanceof Error ? error.message : 'Could not save this bill. Please try again.'),
    });
  };
  const page = useMemo(() => active === 'overview' ? <Overview products={products} sales={sales} onNavigate={go} /> : active === 'billing' ? <Billing products={products} cart={cart} setCart={setCart} onComplete={completeSale} submitting={createSaleMutation.isPending} /> : active === 'products' ? <Products products={products} onUpdate={updateProduct} /> : active === 'sales' ? <Sales sales={sales} onOpenReceipt={setReceiptSale} /> : <SettingsView />, [active, products, sales, cart, createSaleMutation.isPending]);
  return <div className="app-shell flex"><Sidebar active={active} onChange={go} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />{mobileOpen && <button type="button" aria-label="close navigation overlay" data-testid="button-close-navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[#173c3b]/40 md:hidden" />}<main className="content-grid min-w-0 flex-1 overflow-hidden"><div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-7 sm:py-7 lg:px-10"><Topbar active={active} onMenu={() => setMobileOpen(true)} onNewBill={() => go('billing')} onNotify={() => { setNotice('All caught up — no new alerts'); window.setTimeout(() => setNotice(''), 2500); }} />{notice && <div data-testid="status-sale-complete" className="mb-5 flex items-center gap-3 rounded-xl border border-[#a6d2bd] bg-[#edf8f1] px-4 py-3 text-sm font-semibold text-[#317456] shadow-soft page-in"><CircleCheck size={18} />{notice}<button type="button" data-testid="button-dismiss-notice" onClick={() => setNotice('')} className="ml-auto rounded-lg p-1 hover:bg-[#d8eee1]"><X size={15} /></button></div>}{page}</div></main>{receiptSale && <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />}</div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={AppShell} /><Route component={() => <div className="flex min-h-screen items-center justify-center bg-[#f8f5ec] p-6 text-center"><div><p className="font-display text-5xl font-extrabold text-[#28514e]">404</p><p className="mt-3 text-sm text-[#687d78]">That page has moved.</p></div></div>} /></Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;