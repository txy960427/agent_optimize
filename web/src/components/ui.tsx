import type { ReactNode, ButtonHTMLAttributes } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, ChevronRight, Info, BookOpen } from 'lucide-react';

export function Button({children,variant='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger'}) {
 return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'green'|'amber'|'red'}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function Segments({value,onChange,items,label}:{value:string;onChange:(value:string)=>void;items:{id:string;label:string}[];label:string}){
 return <Tabs.Root value={value} onValueChange={onChange}><Tabs.List className="segments" aria-label={label}>{items.map(item=><Tabs.Trigger key={item.id} value={item.id}>{item.label}</Tabs.Trigger>)}</Tabs.List></Tabs.Root>;
}
export function Modal({title,description,trigger,children,open,onOpenChange,onCloseAutoFocus}:{title:string;description:string;trigger?:ReactNode;children:ReactNode;open?:boolean;onOpenChange?:(open:boolean)=>void;onCloseAutoFocus?:(event:Event)=>void}){
 return <Dialog.Root open={open} onOpenChange={onOpenChange}>{trigger&&<Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}<Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content" onCloseAutoFocus={onCloseAutoFocus}><header><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close asChild><button className="icon-btn" aria-label="关闭"><X size={20}/></button></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Notice({children,tone='info'}:{children:ReactNode;tone?:'info'|'warning'|'success'}){return <div className={`notice notice-${tone}`}><Info size={17}/><div>{children}</div></div>}
export function Empty({title,children}:{title:string;children:ReactNode}){return <div className="empty"><h3>{title}</h3><p>{children}</p></div>}
export function Breadcrumb({items}:{items:string[]}){return <nav className="breadcrumb" aria-label="当前位置">{items.map((s,i)=><span key={`${s}-${i}`} className={i===items.length-1?'breadcrumb-current':undefined} aria-current={i===items.length-1?'page':undefined}>{i===0?<BookOpen size={13} aria-hidden="true"/>:<ChevronRight size={12} aria-hidden="true"/>}{s}</span>)}</nav>}
export function VerdictOptions({value,onChange,label='判断结果',labels=['满足','不满足','证据不足']}:{value:string;onChange:(v:'yes'|'no'|'unknown')=>void;label?:string;labels?:string[]}){
 return <div className="verdict-options" role="radiogroup" aria-label={label}>{(['yes','no','unknown'] as const).map((v,i)=><label key={v} className={value===v?`chosen ${v}`:''}><input type="radio" value={v} checked={value===v} onChange={()=>onChange(v)}/><span>{labels[i]}</span></label>)}</div>;
}
export function downloadFile(name:string,content:string){const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
