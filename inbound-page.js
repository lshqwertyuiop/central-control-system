/* Local inbound task implementation; other online pages remain on their published version. */
const InboundTable = window.ConfigurableTable;
const LocalInboundPage = ({data, onTasksChange, alarmTarget}) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const tasks=data, setTasks=onTasksChange;
  const [taskTab,setTaskTab]=useState('active');
  const [taskEditRow, setTaskEditRow] = useState(null);
  const [taskEditFields, setTaskEditFields] = useState({});
  const {message:msg} = App.useApp();

  const canRevoke = (st) => ['WAIT','CHECK_FAILED'].includes(st);

  const [confirmRow, setConfirmRow] = useState(null);
  const [manualNote, setManualNote] = useState('');
  const [editFields, setEditFields] = useState({});
  const anomaly = tasks.find(t => t.status === 'CHECK_FAILED');
  const openConfirm = (row) => {
    setEditFields({ profileUid:row.profileUid, shipNo:row.shipNo, blockNo:row.blockNo,
      programNo:row.programNo, profileType:row.profileType, material:row.material,
      length:row.length, heatNo:row.heatNo });
    setManualNote(row.manualNote || '');
    setConfirmRow(row);
  };
  useEffect(()=>{
    if(!alarmTarget)return;
    const row=tasks.find(task=>task.key===alarmTarget.key);
    if(!row)return;
    setTaskTab(row.status==='FINISHED'?'history':'active');
    if(row.status==='CHECK_FAILED')openConfirm(row);
    else {setDetailRow(row);setDetailOpen(true);}
  },[alarmTarget]);
  const setF = (k, v) => setEditFields(prev => ({ ...prev, [k]: v }));
  const fld = (label, node) => React.createElement(Col, { span:12, style:{marginBottom:10} },
    React.createElement('div', { style:{fontSize:12,color:'#6b7280',marginBottom:4} }, label), node);
  const handleConfirm = () => {
    setTasks(prev => prev.map(t => t.key===confirmRow.key
      ? { ...t, ...editFields, status:'FINISHED', manualNote: manualNote.trim() || '已人工核对确认' } : t));
    msg.success(`型材 ${editFields.profileUid} 已人工确认，产线恢复`);
    setConfirmRow(null); setManualNote('');
  };

  const [adv, setAdv] = useState(null);
  const doAdv = () => {
    if (!adv) return;
    if (adv.type==='revoke') {
      setTasks(prev=>prev.map(t=>t.key===adv.row.key?{...t,status:'NOT_STARTED'}:t));
      msg.success(`任务 ${adv.row.taskNo} 已撤回，状态 → 未开始`);
    } else {
      setTasks(prev=>{
        const disp = prev.filter(t=>t.status==='WAIT'||t.status==='CHECK_FAILED').slice().sort((a,b)=>(a.order??0)-(b.order??0));
        const idx = disp.findIndex(t=>t.key===adv.row.key);
        const sw = adv.type==='up'?idx-1:idx+1;
        if (sw<0||sw>=disp.length) return prev;
        const o1=disp[idx].order, o2=disp[sw].order;
        return prev.map(t=> t.key===disp[idx].key?{...t,order:o2} : (t.key===disp[sw].key?{...t,order:o1} : t));
      });
      msg.success('任务顺序已调整');
    }
    setAdv(null);
  };
  const detailBtn = (r) => React.createElement(Button,{size:'small',type:'link',onClick:()=>{setDetailRow(r);setDetailOpen(true);}},'详情');
  const openTaskEdit = (r) => { setTaskEditRow(r); setTaskEditFields({...r}); };
  const setTaskField = (key, value) => setTaskEditFields(prev=>({...prev,[key]:value}));
  const saveTaskEdit = () => {
    if (!String(taskEditFields.taskNo||'').trim() || !String(taskEditFields.profileUid||'').trim()) {
      msg.warning('任务号和型材唯一编码不能为空'); return;
    }
    const next = {...taskEditFields,
      taskNo:String(taskEditFields.taskNo).trim(), profileUid:String(taskEditFields.profileUid).trim()};
    setTasks(prev=>prev.map(t=>t.key===taskEditRow.key?next:t));
    if (detailRow?.key===taskEditRow.key) setDetailRow(next);
    msg.success(`任务 ${next.taskNo} 已更新`);
    setTaskEditRow(null); setTaskEditFields({});
  };
  const editBtn = (r) => React.createElement(Button,{size:'small',type:'link',onClick:()=>openTaskEdit(r)},'编辑');

  const baseCols = [
    {title:'型材唯一编码', dataIndex:'profileUid', width:150, fixed:'left', ellipsis:true,
      render:v=>React.createElement('span',{className:'kb-mat-id'},v)},
    {title:'船号', dataIndex:'shipNo', width:90},
    {title:'分段号', dataIndex:'blockNo', width:90},
    {title:'程序号', dataIndex:'programNo', width:85,
      render:v=>React.createElement(Tag,{color:'geekblue',style:{margin:0}},v)},
    {title:'型材规格', dataIndex:'profileType', width:140},
    {title:'材质', dataIndex:'material', width:85,
      render:v=>React.createElement(Tag,{color:'blue',style:{margin:0}},v)},
    {title:'长度', dataIndex:'length', width:90, render:v=>`${v} mm`},
    {title:'炉批号', dataIndex:'heatNo', width:90},
    {title:'入库模式', dataIndex:'mode', width:100,
      render:v=>React.createElement(Tag,{color:v==='SCAN'?'blue':'orange'},INB_MODES[v]||v)},
    {title:'状态', dataIndex:'status', width:120,
      render:v=>React.createElement(Tag,{color:INB_STATUSES[v]?.color},INB_STATUSES[v]?.label||v)},
  ];
  const createTimeCol = {title:'创建时间', dataIndex:'createTime', width:155, ellipsis:true};
  const activeCols = [...baseCols, createTimeCol,
    {title:'目标库区', dataIndex:'zone', width:150,
      render:v=>v?React.createElement(Tag,{color:'blue',style:{margin:0}},v):'待分配'},
    {title:'目标库位', dataIndex:'binCode', width:100, render:v=>v||'待分配'},
    {title:'操作', key:'op', width:180, fixed:'right', render:(_,r)=>React.createElement(Space,{size:4},
      detailBtn(r),
      r.status==='NOT_STARTED'&&editBtn(r),
      r.status==='NOT_STARTED'&&React.createElement(Button,{size:'small',type:'link',danger:true,onClick:()=>msg.info('删除功能暂未实现')},'删除'),
      canRevoke(r.status)&&React.createElement(Button,{size:'small',type:'link',danger:true,onClick:()=>setAdv({type:'revoke',row:r})},'撤回'))}];
  const historyCols = [...baseCols,
    {title:'目标库区', dataIndex:'zone', width:110},
    {title:'目标库位', dataIndex:'binCode', width:100},
    {title:'开始时间', dataIndex:'startTime', width:155, ellipsis:true},
    {title:'结束时间', dataIndex:'endTime', width:155, ellipsis:true},
    {title:'操作', key:'op', width:80, fixed:'right', render:(_,r)=>detailBtn(r)}];
  const activeList = tasks.filter(t=>['NOT_STARTED','WAIT','CHECK_FAILED','IN_PROGRESS'].includes(t.status)).slice().sort((a,b)=>(a.order??0)-(b.order??0));
  const histList = tasks.filter(t=>t.status==='FINISHED');

  const statusCounts = Object.keys(INB_STATUSES).map(k=>({
    key:k, ...INB_STATUSES[k],
    cnt: tasks.filter(t=>t.status===k).length,
  })).filter(s=>s.cnt>0);

  return React.createElement('div', {className:'page-content'},
    anomaly && React.createElement(Alert, {
      type:'error', showIcon:true, className:'section-gap',
      message:'校验异常 · 产线已停线',
      description:`相机 CK-01 检测到型材 ${anomaly.profileUid} 异常，需人工确认后恢复产线。`,
      action: React.createElement(Button, { size:'small', danger:true,
        onClick:()=>openConfirm(anomaly) }, '人工确认'),
    }),
    // Status summary tags
    React.createElement(Card,{size:'small',className:'section-gap'},
      React.createElement(Space,{wrap:true},
        React.createElement(Text,{type:'secondary',style:{fontSize:13}},'任务状态：'),
        ...statusCounts.map(s=>
          React.createElement(Tag,{key:s.key,color:s.color,style:{fontSize:13,padding:'2px 10px'}},
            `${s.label} ${s.cnt}`
          )
        )
      )
    ),

    React.createElement(Card,{ size:'small' },
      React.createElement(Tabs,{
        activeKey:taskTab,onChange:setTaskTab,
        items:[
          { key:'active', label:`当前任务 (${activeList.length})`,
            children: React.createElement(InboundTable,{fieldConfigKey:'inbound-active',fieldConfigTitle:'入库当前任务', columns:activeCols, dataSource:activeList, rowKey:'key', size:'small',
              scroll:{x:1490}, pagination:{pageSize:10,showTotal:t=>`共 ${t} 条`}, locale:{emptyText:'暂无当前任务'} }) },
          { key:'history', label:`历史任务 (${histList.length})`,
            children: React.createElement(InboundTable,{fieldConfigKey:'inbound-history',fieldConfigTitle:'入库历史任务', columns:historyCols, dataSource:histList, rowKey:'key', size:'small',
              scroll:{x:1570}, pagination:{pageSize:10,showTotal:t=>`共 ${t} 条`}, locale:{emptyText:'暂无历史任务'} }) },
        ],
      })
    ),

    React.createElement(Modal,{
      title:`编辑入库任务 — ${taskEditRow?.taskNo||''}`, open:!!taskEditRow, width:760,
      okText:'保存', cancelText:'取消', onOk:saveTaskEdit,
      onCancel:()=>{setTaskEditRow(null);setTaskEditFields({});}, destroyOnClose:true,
    }, taskEditRow && React.createElement(Form,{layout:'vertical'},
      React.createElement(Row,{gutter:16},
        ...[
          ['任务号','taskNo'],['型材唯一编码','profileUid'],['船号','shipNo'],['分段号','blockNo'],
          ['程序号','programNo'],['型材规格','profileType'],['材质','material'],['炉批号','heatNo'],
          ['目标库位','binCode'],['创建时间','createTime'],
          ['开始时间','startTime'],['结束时间','endTime'],
        ].map(([label,key])=>React.createElement(Col,{span:key==='profileUid'||key==='taskNo'?12:8,key},
          React.createElement(Form.Item,{label,required:key==='taskNo'||key==='profileUid'},
            React.createElement(Input,{value:taskEditFields[key]||'',onChange:e=>setTaskField(key,e.target.value)})))),
        React.createElement(Col,{span:8},React.createElement(Form.Item,{label:'长度（mm）'},
          React.createElement(InputNumber,{min:0,style:{width:'100%'},value:taskEditFields.length,onChange:v=>setTaskField('length',v)}))),
        React.createElement(Col,{span:8},React.createElement(Form.Item,{label:'入库模式'},
          React.createElement(Select,{style:{width:'100%'},value:taskEditFields.mode,onChange:v=>setTaskField('mode',v),
            options:Object.entries(INB_MODES).map(([value,label])=>({value,label}))}))),
        React.createElement(Col,{span:8},React.createElement(Form.Item,{label:'当前状态'},
          React.createElement(Select,{style:{width:'100%'},value:taskEditFields.status,onChange:v=>setTaskField('status',v),
            options:Object.entries(INB_STATUSES).map(([value,cfg])=>({value,label:cfg.label}))}))),
        React.createElement(Col,{span:8},React.createElement(Form.Item,{label:'目标库区'},
          React.createElement(Select,{allowClear:true,style:{width:'100%'},value:taskEditFields.zone||undefined,
            onChange:v=>setTaskField('zone',v||''),options:INB_ZONES.map(z=>({value:z,label:z}))}))),
      )
    )),

    // Detail drawer
    React.createElement(Modal,{
      title:`任务详情 — ${detailRow?.taskNo}`,
      open:detailOpen, footer:null, width:640,
      onCancel:()=>setDetailOpen(false),
    },
      detailRow && React.createElement(Tabs,{defaultActiveKey:'info', items:[
        { key:'info', label:'任务信息',
          children: React.createElement(Descriptions,{column:2,size:'small',bordered:true},
            React.createElement(Descriptions.Item,{label:'任务号',span:2},detailRow.taskNo),
            React.createElement(Descriptions.Item,{label:'型材唯一编码',span:2},detailRow.profileUid),
            React.createElement(Descriptions.Item,{label:'船号'},detailRow.shipNo),
            React.createElement(Descriptions.Item,{label:'分段号'},detailRow.blockNo),
            React.createElement(Descriptions.Item,{label:'程序号'},detailRow.programNo),
            React.createElement(Descriptions.Item,{label:'型材规格'},detailRow.profileType),
            React.createElement(Descriptions.Item,{label:'材质'},detailRow.material),
            React.createElement(Descriptions.Item,{label:'长度'},`${detailRow.length} mm`),
            React.createElement(Descriptions.Item,{label:'炉批号'},detailRow.heatNo),
            React.createElement(Descriptions.Item,{label:'入库模式'},
              React.createElement(Tag,{color:detailRow.mode==='SCAN'?'blue':'orange'},INB_MODES[detailRow.mode]||detailRow.mode)
            ),
            React.createElement(Descriptions.Item,{label:'当前状态'},
              React.createElement(Tag,{color:INB_STATUSES[detailRow.status]?.color},INB_STATUSES[detailRow.status]?.label)
            ),
            React.createElement(Descriptions.Item,{label:'目标库区'},detailRow.zone||'—'),
            React.createElement(Descriptions.Item,{label:'目标库位'},detailRow.binCode||'待分配'),
            React.createElement(Descriptions.Item,{label:'创建时间'},detailRow.createTime),
            React.createElement(Descriptions.Item,{label:'开始时间'},detailRow.startTime||'—'),
            React.createElement(Descriptions.Item,{label:'结束时间'},detailRow.endTime||'—'),
          )
        },
        ...(detailRow.status==='FINISHED' ? [{ key:'mat', label:'母材报工 (2)',
          children: React.createElement(InboundTable, {
            columns:[
              {title:'工序',dataIndex:'phaseNo',width:90,render:v=>React.createElement(Tag,{color:'cyan'},v)},
              {title:'车间',dataIndex:'workshopNo',width:80},
              {title:'工位',dataIndex:'workplaceNo',width:80},
              {title:'报工状态',dataIndex:'opStatus',width:100,render:v=>React.createElement(Tag,{color:v==='START'?'processing':'success'},v==='START'?'开工':'完工')},
              {title:'操作人',dataIndex:'operator',width:90},
              {title:'关联库位',dataIndex:'binCode',width:100},
              {title:'操作时间',dataIndex:'opTime',width:160},
            ],
            dataSource:[
              {key:'start',phaseNo:'入库',workshopNo:'仓储车间',workplaceNo:'入库口',opStatus:'START',operator:'操作员1',binCode:detailRow.binCode,opTime:detailRow.startTime},
              {key:'finish',phaseNo:'入库',workshopNo:'仓储车间',workplaceNo:'入库口',opStatus:'FINISH',operator:'操作员1',binCode:detailRow.binCode,opTime:detailRow.endTime},
            ],
            rowKey:'key', size:'small', scroll:{x:700}, pagination:false,
          })
        }] : []),
        ...(detailRow.status!=='WAIT' ? [{ key:'verify', label:'校验结果',
          children: React.createElement('div',{style:{textAlign:'center'}},
            React.createElement('img',{src:inbVerifyImg(detailRow), alt:'校验结果',
              style:{maxWidth:'100%',borderRadius:8,border:'1px solid #f0f0f0'}}),
            React.createElement('div',{style:{marginTop:8,fontSize:12,
              color: detailRow.status==='CHECK_FAILED'?'#cf1322':'#389e0d'}},
              detailRow.status==='CHECK_FAILED' ? '校验异常：与标准不符，产线停线，待人工确认' : '校验通过'),
            detailRow.manualNote && React.createElement(Alert,{type:'warning',showIcon:true,
              style:{marginTop:10,textAlign:'left'}, message:'人工处理记录', description:detailRow.manualNote})
          )
        }] : []),
      ]})
    ),

    // 校验异常 · 人工确认弹窗（支持手工输入信息）
    React.createElement(Modal,{
      title:'⚠️ 校验异常 · 人工确认', open:!!confirmRow, width:560,
      okText:'确认放行并恢复产线', cancelText:'暂不处理',
      onOk:handleConfirm, onCancel:()=>setConfirmRow(null),
    },
      confirmRow && React.createElement('div',null,
        React.createElement(Alert,{type:'error',showIcon:true,style:{marginBottom:14},
          message:'校验异常',
          description:`相机检测到型材 ${confirmRow.profileUid} 异常，需人工确认后恢复产线`}),
        React.createElement('div',{style:{textAlign:'center',marginBottom:14}},
          React.createElement('img',{src:inbVerifyImg(confirmRow), alt:'校验结果',
            style:{maxWidth:'100%',borderRadius:8,border:'1px solid #f0f0f0'}})),
        React.createElement(Row,{gutter:12},
          fld('型材唯一编码', React.createElement(Input,{size:'small',value:editFields.profileUid||'',disabled:true})),
          fld('船号', React.createElement(Input,{size:'small',value:editFields.shipNo||'',onChange:e=>setF('shipNo',e.target.value)})),
          fld('分段号', React.createElement(Input,{size:'small',value:editFields.blockNo||'',onChange:e=>setF('blockNo',e.target.value)})),
          fld('程序号', React.createElement(Select,{size:'small',style:{width:'100%'},value:editFields.programNo,onChange:v=>setF('programNo',v),options:INB_PROGS.map(x=>({value:x,label:x}))})),
          fld('型材规格', React.createElement(Input,{size:'small',value:editFields.profileType||'',onChange:e=>setF('profileType',e.target.value)})),
          fld('材质', React.createElement(Select,{size:'small',style:{width:'100%'},value:editFields.material,onChange:v=>setF('material',v),options:INB_MATERIALS.map(x=>({value:x,label:x}))})),
          fld('长度(mm)', React.createElement(InputNumber,{size:'small',style:{width:'100%'},value:editFields.length,onChange:v=>setF('length',v)})),
          fld('炉批号', React.createElement(Input,{size:'small',value:editFields.heatNo||'',onChange:e=>setF('heatNo',e.target.value)})),
        ),
        React.createElement('div',{style:{margin:'2px 0 6px',fontSize:13,fontWeight:600}},'处理说明（选填）'),
        React.createElement(Input.TextArea,{rows:2, value:manualNote,
          onChange:(e)=>setManualNote(e.target.value), placeholder:'可填写人工复核结果或处理说明…'})
      )
    ),

    React.createElement(Modal,{
      title:'⚠️ 高级权限操作确认', open:!!adv, okText:'确认执行', cancelText:'取消',
      okButtonProps:{danger:true}, onOk:doAdv, onCancel:()=>setAdv(null),
    },
      React.createElement(Alert,{type:'warning',showIcon:true,style:{marginBottom:12},
        message:'此操作会影响辊道线',
        description:'撤回任务 / 调整任务顺序属于高级权限操作，请确认辊道线情况后继续。'}),
      adv && React.createElement('div',{style:{fontSize:13}},
        `任务：${adv.row.taskNo} · 操作：${adv.type==='revoke'?'撤回（→未开始）':(adv.type==='up'?'上移':'下移')}`)
    ),
  );
};
