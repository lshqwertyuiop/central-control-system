/* 每类业务列表独立保存显示列；未指定配置键的详情表保持完整。 */
(function(root){
  const h=React.createElement,{useState,useEffect}=React;
  const {Table:BaseTable,Button,Modal,Checkbox,Space,Typography,App}=antd;
  const PREFIX='central-control:list-fields:v1:';
  const textOf=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(textOf).join(''):value?.props?textOf(value.props.children):'';
  const keyOf=(column,index)=>String(column.key??(Array.isArray(column.dataIndex)?column.dataIndex.join('.'):column.dataIndex)??(textOf(column.title)||`column-${index}`));
  const fixed=column=>!textOf(column.title)||/^(操作|操作栏|快捷操作)$/.test(textOf(column.title))||column.fieldConfigFixed;
  const fieldsOf=columns=>columns.flatMap((column,index)=>column.children?fieldsOf(column.children):fixed(column)?[]:[{value:keyOf(column,index),label:textOf(column.title)}]);
  const filterColumns=(columns,hidden)=>columns.flatMap((column,index)=>{
    if(column.children){const children=filterColumns(column.children,hidden);return children.length?[{...column,children}]:[];}
    return fixed(column)||!hidden.includes(keyOf(column,index))?[column]:[];
  });
  const load=key=>{try{const value=JSON.parse(localStorage.getItem(PREFIX+key));return Array.isArray(value)?value.filter(item=>typeof item==='string'):[];}catch(_){return [];}};
  function Configured({fieldConfigKey,fieldConfigTitle='列表',columns=[],...props}){
    const {message}=App.useApp();
    const [hidden,setHidden]=useState(()=>load(fieldConfigKey)),[draft,setDraft]=useState([]),[open,setOpen]=useState(false);
    const fields=fieldsOf(columns),visible=filterColumns(columns,hidden);
    useEffect(()=>{
      const sync=event=>{if(event.type==='storage'&&event.key!==PREFIX+fieldConfigKey)return;if(event.type!=='storage'&&event.detail!==fieldConfigKey)return;setHidden(load(fieldConfigKey));};
      window.addEventListener('central-control:list-fields',sync);window.addEventListener('storage',sync);
      return ()=>{window.removeEventListener('central-control:list-fields',sync);window.removeEventListener('storage',sync);};
    },[fieldConfigKey]);
    const save=()=>{
      if(fields.length&&!fields.some(field=>!draft.includes(field.value))){message.warning('至少保留一个显示字段');return;}
      try{localStorage.setItem(PREFIX+fieldConfigKey,JSON.stringify(draft));setHidden(draft);setOpen(false);window.dispatchEvent(new CustomEvent('central-control:list-fields',{detail:fieldConfigKey}));}
      catch(_){message.error('配置保存失败，请检查浏览器存储空间');}
    };
    const width=cols=>cols.reduce((sum,column)=>sum+(column.children?width(column.children):Number(column.width)||0),0);
    const scroll=props.scroll&&typeof props.scroll.x==='number'?{...props.scroll,x:Math.max(1,props.scroll.x-width(columns)+width(visible))}:props.scroll;
    return h(React.Fragment,null,
      fields.length>0&&h('div',{className:'list-fields-toolbar',style:{display:'flex',justifyContent:'flex-end',marginBottom:8}},
        h(Button,{size:'small',onClick:()=>{setDraft(hidden);setOpen(true);}},'卡片字段配置')),
      h(BaseTable,{...props,columns:visible,scroll}),
      h(Modal,{title:`${fieldConfigTitle} · 卡片字段配置`,open,onCancel:()=>setOpen(false),onOk:save,okText:'保存配置',cancelText:'取消',
        footer:h(Space,null,h(Button,{onClick:()=>setDraft([])},'恢复默认'),h(Button,{onClick:()=>setOpen(false)},'取消'),h(Button,{type:'primary',onClick:save},'保存配置'))},
        h(Typography.Paragraph,{type:'secondary'},'仅调整当前列表的显示字段，详情信息保持完整。'),
        h(Checkbox.Group,{value:fields.filter(field=>!draft.includes(field.value)).map(field=>field.value),options:fields,
          onChange:keys=>setDraft(fields.filter(field=>!keys.includes(field.value)).map(field=>field.value)),style:{display:'flex',flexWrap:'wrap',gap:14}})));
  }
  root.ConfigurableTable=function(props){return props.fieldConfigKey?h(Configured,{...props,key:props.fieldConfigKey}):h(BaseTable,props);};
  root.ListFieldConfig={fieldsOf,filterColumns};
})(window);
