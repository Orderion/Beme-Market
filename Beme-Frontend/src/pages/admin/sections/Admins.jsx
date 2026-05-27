import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

const ALL_PERMS = [
  { key:"approve_stores",      label:"Approve Stores",       sub:"Grant store admin access" },
  { key:"suspend_users",       label:"Suspend Users",         sub:"Suspend or restore accounts" },
  { key:"view_financials",     label:"View Financials",       sub:"See revenue and payout data" },
  { key:"manage_subscriptions",label:"Manage Subscriptions",  sub:"Edit subscription plans" },
  { key:"add_admins",          label:"Add Admins",            sub:"Create new admin accounts" },
  { key:"delete_content",      label:"Delete Content",        sub:"Remove products or media" },
  { key:"send_notifications",  label:"Send Notifications",    sub:"Broadcast to users" },
  { key:"manage_homepage",     label:"Manage Homepage",       sub:"Edit homepage content" },
];

function fmt(ts){if(!ts)return"—";const d=ts?.toMillis?new Date(ts.toMillis()):new Date(ts);return d.toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"});}

export default function AdminsSection() {
  const { isSuperAdmin } = useAuth();
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ email:"", perms:{} });
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"users"), where("role","in",["admin","super_admin","shop_admin"])));
      setAdmins(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const togglePerm = (key) => setForm(prev=>({...prev,perms:{...prev.perms,[key]:!prev.perms[key]}}));

  const addAdmin = async () => {
    if (!form.email.trim()) { setMsg("❌ Email required."); return; }
    setSaving(true); setMsg("");
    try {
      const permsArray = Object.keys(form.perms).filter(k=>form.perms[k]);
      // Create user doc with admin role (email invite via password reset)
      const snap = await getDocs(query(collection(db,"users"),where("email","==",form.email.trim())));
      if (!snap.empty) {
        const uid = snap.docs[0].id;
        await updateDoc(doc(db,"users",uid),{role:"admin",adminPerms:permsArray,updatedAt:serverTimestamp()});
        setMsg("✅ Admin role assigned to existing user.");
      } else {
        setMsg("⚠️ User not found. Ask them to sign up first, then reassign.");
      }
      setShowAdd(false); setForm({email:"",perms:{}});
      load();
    } catch(e) { setMsg("❌ "+(e.message||"Failed.")); }
    finally { setSaving(false); }
  };

  const updatePerms = async (uid, perms) => {
    try {
      await updateDoc(doc(db,"users",uid),{adminPerms:perms,updatedAt:serverTimestamp()});
      setAdmins(prev=>prev.map(a=>a.id===uid?{...a,adminPerms:perms}:a));
      setEditing(null);
    } catch(e) { console.error(e); }
  };

  const [editPerms, setEditPerms] = useState({});
  const startEdit = (admin) => { const p={}; (admin.adminPerms||[]).forEach(k=>{p[k]=true;}); setEditPerms(p); setEditing(admin.id); };

  function getRoleLabel(u) {
    const r = String(u.role||"").toLowerCase();
    if (r==="super_admin") return "Super Admin";
    if (r==="shop_admin")  return "Shop Admin";
    return "Admin";
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,gap:14}}>
        <div>
          <div className="ap-page-title">Admin Accounts</div>
          <div className="ap-page-sub">Manage admin users and their permissions</div>
        </div>
        {isSuperAdmin && (
          <button className="ap-btn ap-btn--primary" onClick={()=>setShowAdd(s=>!s)}>+ Add Admin</button>
        )}
      </div>

      {/* Add admin form */}
      {showAdd && (
        <div className="ap-card ap-card--p" style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--ap-text)",marginBottom:14}}>Assign Admin Role</div>
          <div className="ap-field" style={{marginBottom:14}}>
            <label className="ap-field-label">User Email</label>
            <input className="ap-input" type="email" placeholder="user@example.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
            <div className="ap-field-hint">The user must already have a Beme Market account.</div>
          </div>
          <div style={{marginBottom:14}}>
            <div className="ap-field-label" style={{marginBottom:10}}>Permissions</div>
            <div className="ap-perms-grid">
              {ALL_PERMS.map(p=>(
                <div key={p.key} className="ap-perm-row">
                  <div className="ap-perm-info">
                    <div className="ap-perm-label">{p.label}</div>
                    <div className="ap-perm-sub">{p.sub}</div>
                  </div>
                  <label className="ap-toggle">
                    <input type="checkbox" checked={!!form.perms[p.key]} onChange={()=>togglePerm(p.key)}/>
                    <div className="ap-toggle-track"/>
                  </label>
                </div>
              ))}
            </div>
          </div>
          {msg && <div className={`ap-msg ${msg.startsWith("✅")?"ap-msg--ok":msg.startsWith("⚠️")?"ap-msg--info":"ap-msg--err"}`} style={{marginBottom:12}}>{msg}</div>}
          <div style={{display:"flex",gap:8}}>
            <button className="ap-btn ap-btn--ghost" onClick={()=>{setShowAdd(false);setMsg("");}}>Cancel</button>
            <button className="ap-btn ap-btn--primary" onClick={addAdmin} disabled={saving}>{saving?"Saving…":"Assign Admin"}</button>
          </div>
        </div>
      )}

      {/* Admins table */}
      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead><tr><th>Admin</th><th>Role</th><th>Permissions</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? [1,2,3].map(i=><tr key={i}>{[1,2,3,4,5].map(j=><td key={j}><div className="ap-skeleton" style={{height:16,borderRadius:4}}/></td>)}</tr>) :
            admins.length===0 ? <tr><td colSpan={5}><div className="ap-empty"><div className="ap-empty-title">No admins found</div></div></td></tr> :
            admins.map(a=>(
              <tr key={a.id}>
                <td>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--ap-text)"}}>{a.displayName||a.email||"Admin"}</div>
                  <div style={{fontSize:11,color:"var(--ap-muted)"}}>{a.email}</div>
                </td>
                <td><span className="ap-badge ap-badge--purple">{getRoleLabel(a)}</span></td>
                <td>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {(a.adminPerms||[]).slice(0,3).map(p=>(
                      <span key={p} className="ap-badge ap-badge--gray" style={{fontSize:10}}>{p.replace(/_/g," ")}</span>
                    ))}
                    {(a.adminPerms||[]).length > 3 && <span className="ap-badge ap-badge--gray" style={{fontSize:10}}>+{(a.adminPerms||[]).length-3} more</span>}
                    {(a.adminPerms||[]).length===0 && <span style={{fontSize:11,color:"var(--ap-muted)"}}>No custom perms</span>}
                  </div>
                </td>
                <td><span style={{fontSize:12,color:"var(--ap-muted)"}}>{fmt(a.createdAt)}</span></td>
                <td>
                  {isSuperAdmin && <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>startEdit(a)}>Edit Perms</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit permissions modal */}
      {editing && (
        <div className="ap-modal-backdrop" onClick={()=>setEditing(null)}>
          <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="ap-modal-head">
              <span className="ap-modal-title">Edit Permissions</span>
              <button className="ap-modal-close" onClick={()=>setEditing(null)}>✕</button>
            </div>
            <div className="ap-modal-body">
              <div className="ap-perms-grid">
                {ALL_PERMS.map(p=>(
                  <div key={p.key} className="ap-perm-row">
                    <div className="ap-perm-info">
                      <div className="ap-perm-label">{p.label}</div>
                      <div className="ap-perm-sub">{p.sub}</div>
                    </div>
                    <label className="ap-toggle">
                      <input type="checkbox" checked={!!editPerms[p.key]} onChange={()=>setEditPerms(prev=>({...prev,[p.key]:!prev[p.key]}))}/>
                      <div className="ap-toggle-track"/>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="ap-btn ap-btn--primary" onClick={()=>updatePerms(editing,Object.keys(editPerms).filter(k=>editPerms[k]))}>Save Permissions</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
