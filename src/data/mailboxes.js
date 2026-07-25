const createLetter = (id, title, author, body) => ({
  id,
  title,
  salutation: '张导：',
  body: Array.isArray(body) ? body : [body],
  signature: author,
  date: '十周年用户来信',
})

const ALL_MAILBOXES = [
  {
    id: 'mountains-and-seas',
    number: '01',
    name: '山海之间',
    subtitle: '从新疆山区到海边电站',
    tone: 'amber',
    letters: [
      createLetter(
        'mountains-and-seas-1',
        '有马，也盼一副好鞍',
        '山硕荣',
        '我是个新疆人，也是一名水利工作者，现在正在山区建设水利枢纽。我有 C2000MAX，却一直没有合适的流量卡用，真是“有马没鞍”。',
      ),
      createLetter(
        'mountains-and-seas-2',
        '海边电站的一封信',
        '风铃卐',
        [
          '我在海边的一座电站工作。这里盐雾大，只有移动信号勉强能用，希望以后能有更便携的 C2000MAX、官方铝制防护壳和短款外置天线，让设备在弱信号环境里更稳定。',
          '对我们这些外勤人员来说，网络稳定比峰值网速更重要。回到宿舍后，能顺畅地和家人打电话、视频，就是很踏实的事。',
        ],
      ),
      createLetter(
        'mountains-and-seas-3',
        '取一次快递，要走两小时',
        '凝望玖',
        '我想要 AK68-798 内测，解决自己的网络痛点。现在取一次快递都不容易，要走两小时到镇上，重庆天气又热，很容易中暑。所以比起反复抽取，我更希望能直接得到真正需要的设备。',
      ),
      createLetter(
        'mountains-and-seas-4',
        '一线城市也有信号死角',
        '李健',
        '我在深圳这样的一线城市，却一直没有一张速率高、又适合本地信号环境的移动流量卡。联通和电信在我这里都很卡，希望移动网络的选择能更多一些。',
      ),
      createLetter(
        'mountains-and-seas-5',
        '刚毕业后的第一间出租屋',
        '黄少',
        '我今年刚毕业，一个人在厦门租了城中村的房子，网络条件不太好。希望能有一台 5G CPE 或一张合适的流量卡，给刚开始独立生活的自己一张稳定的网。',
      ),
      createLetter(
        'mountains-and-seas-6',
        '网络带来的安全感',
        '小猪佩奇呀',
        [
          '租房的两年里，房东 Wi-Fi 不稳定，拉网线又贵。后来在直播间看见 C2000MAX，我等到公测机开放就下了单。',
          '设备小巧，刚好能装进口袋，上班、出门都带着。它给我的不只是网速，还有随时能连上网络的安全感。',
        ],
      ),
      createLetter(
        'mountains-and-seas-7',
        '给家里老人装监控',
        '于是',
        '以后能不能推出一张适合家用监控摄像头的流量卡？家里有老人的朋友，常常需要远程看一看家中的情况。稳定、省心的小流量套餐，也是一种很实际的陪伴。',
      ),
      createLetter(
        'mountains-and-seas-8',
        '这里只有移动信号好',
        '高英杰',
        [
          '我用过很多品牌的随身 Wi-Fi，鲲鹏的网速是最让我满意的。我买了好几台 C2000MAX，也推荐同事购买。',
          '可惜我所在的地方只有移动信号好，希望以后能有更容易获得的移动流量卡，让设备真正发挥作用。',
        ],
      ),
    ],
  },
  {
    id: 'everyday-network',
    number: '02',
    name: '生活现场',
    subtitle: '宿舍、出租屋与工作的日常',
    tone: 'copper',
    letters: [
      createLetter(
        'everyday-network-1',
        '六个人的宿舍网络',
        '吐个泡泡',
        [
          '我是在校学生，宿舍校园网一到晚上高峰期就会崩。三月份入手 C2000MAX 后，我们宿舍六个人一起用也不卡，终于摆脱了校园网的限制。',
          '如果以后还能优化风扇，并增加一个给其他设备供电的接口，就更好了。',
        ],
      ),
      createLetter(
        'everyday-network-2',
        '城中村的宽带烦恼',
        '凹凸曼',
        '它解决了我住在城中村时宽带贵、流量也贵的烦恼。真正好用的网络产品，就是能把日常生活里那些反复出现的小麻烦一次解决掉。',
      ),
      createLetter(
        'everyday-network-3',
        '整个宿舍都靠它',
        '西奈灌饼',
        '张导，我们整个宿舍的流畅网络就靠你了。大家一起上网还能保持稳定，对住校的人来说，这就是最直接的产品价值。',
      ),
      createLetter(
        'everyday-network-4',
        '上班寝室里没有 Wi-Fi',
        '好好吃饭',
        '我上班住的寝室里没有 Wi-Fi，希望能有一台合适的设备，让下班后的时间也可以正常上网、和家里联系。',
      ),
      createLetter(
        'everyday-network-5',
        '家里、工作和学校各需要一台',
        '你又没了',
        [
          '我是第一批 C2000MAX 用户。设备打游戏延迟低，携带也方便，流量套餐比常见品牌更实在。',
          '如果还能有一台，我想家里放一台，工作或学校再带一台，让网络跟着生活场景走。',
        ],
      ),
      createLetter(
        'everyday-network-6',
        '推荐给不想拉宽带的朋友',
        'xiong',
        '朋友租房不想拉宽带时，我直接推荐了鲲鹏的设备。便携网络的意义，就是让临时的住处、短期的工作和不断变化的生活，也能很快拥有稳定连接。',
      ),
      createLetter(
        'everyday-network-7',
        '帮帮没网的上班族',
        '新青年路人甲',
        '希望以后能多照顾那些租房、住寝室、工作地点不固定，却又离不开网络的人。便携、稳定、价格合适，真的能解决很多人的刚需。',
      ),
      createLetter(
        'everyday-network-8',
        '设备和好卡，缺一不可',
        '刘先生',
        '我需要一张适合自己的好卡，也想拥有一台 MAX。对普通用户来说，设备和流量缺一不可，组合起来好用才是真正完整的体验。',
      ),
    ],
  },
  {
    id: 'field-notes',
    number: '03',
    name: '使用手记',
    subtitle: '来自真实用户的体验记录',
    tone: 'blue',
    letters: [
      createLetter(
        'field-notes-1',
        '靠谱，是最朴素的评价',
        'HHY',
        '感谢鲲鹏，让我们可以用上这么靠谱的 CPE 上网。没有复杂的形容词，稳定地连上、安心地使用，就是我最看重的体验。',
      ),
      createLetter(
        'field-notes-2',
        '稳定、流畅，也愿意继续支持',
        '王勇',
        '我一直使用鲲鹏 C2000MAX，信号稳定、网速流畅，体验很好。祝愿十周年活动圆满，也希望品牌和产品都越来越好。',
      ),
      createLetter(
        'field-notes-3',
        '一份长期实测计划',
        '王熙',
        [
          '我已经购入 C2000MAX，接下来会做长期、多场景实测，包括弱信号环境稳定性、有线 2.5G 传输和长时间满载运行。',
          '我会如实分享设备体验，也希望测试中遇到问题时，能继续向团队请教。',
        ],
      ),
      createLetter(
        'field-notes-4',
        '体验是不错的',
        '态美沉香（小汪）',
        '我很喜欢鲲鹏的产品，实际使用体验也一直不错。希望团队继续把每一个细节做扎实，让好体验变成更多用户愿意留下来的理由。',
      ),
      createLetter(
        'field-notes-5',
        'C2000MAX 很好',
        '阿巴阿巴',
        'C2000MAX 很好，我很喜欢。好产品不一定需要复杂的故事，有时就是用了以后，愿意很直接地说一句“真的不错”。',
      ),
      createLetter(
        'field-notes-6',
        '从鲲鹏 CC 到 C2000MAX',
        '一位 C2000MAX 用户',
        [
          '从鲲鹏 CC 初识，到后来选择 C2000MAX，我一直在关注这个品牌。虽然自己每月用不了太多流量，但还是希望配套套餐能更亲民。',
          '天火卡、寂寞卡的体验令人期待，也希望未来普通用户能有更多机会真正用上。',
        ],
      ),
      createLetter(
        'field-notes-7',
        '一路更新设备的老用户',
        '花生',
        '我是紫金会员和粉丝团十级用户，从早期的流量卡、NBCPE-668 一路更新到 AK68-788。每一次升级，都是因为期待产品继续进步。',
      ),
      createLetter(
        'field-notes-8',
        '连两块硬盘都支援了',
        '锌锰铜铁',
        '鲲鹏的新产品我大多买过，甚至把自己的两块 18T 硬盘都支援给了团队。期待鲲鹏真正起飞，也期待有一天实现上市的梦想。',
      ),
    ],
  },
  {
    id: 'companionship',
    number: '04',
    name: '一路同行',
    subtitle: '陪伴不一定需要大声表达',
    tone: 'rose',
    letters: [
      createLetter('companionship-1', '一直支持你', 'Travelers.', '一直支持你。短短五个字，却是很多老朋友最真诚、也最长久的表达。'),
      createLetter('companionship-2', '十岁我在，二十岁也要在', '啥也不会', '十周年我在，二十周年我也要在。希望下一段十年，仍然能在新产品、新直播和新故事里见面。'),
      createLetter('companionship-3', '感谢所有人的付出', '知行合一', '希望鲲鹏越做越大、越做越好。感谢鲲鹏，感谢张导，也感谢团队里每一位工作人员的付出。'),
      createLetter('companionship-4', '阿达西会一直支持', '林@', '张导一直对阿达西很好，我们也会一直支持鲲鹏真正远航。加油，愿这份来自新疆朋友的情谊一直都在。'),
      createLetter('companionship-5', '从认识到跟随', '谢小鸿', '从认识到跟随，不知不觉已经成了习惯。鲲鹏加油，愿熟悉的人一直都在，新的朋友也不断到来。'),
      createLetter('companionship-6', '我会一直陪伴', 'L江涛', '我会一直陪伴张导。不是每一次支持都需要热闹地表达，长久地在场本身就很珍贵。'),
      createLetter('companionship-7', '为更好的产品贡献一份力', '夜幕下的放牧人', '支持张导，也愿意为公司走得更远贡献一份力量。希望未来能有更好的融资、更扎实的产品，也有更长久的陪伴。'),
      createLetter('companionship-8', '开播就看，关播也在', '野生思考的量子纠缠者', '开播就看，关播也在。陪伴不只体现在消费多少，愿意花时间听、认真看产品成长，也是一种支持。'),
    ],
  },
  {
    id: 'anniversary',
    number: '05',
    name: '十周年祝福',
    subtitle: '把生日快乐写成一封信',
    tone: 'olive',
    letters: [
      createLetter('anniversary-1', '乘风而上，未来可期', '习惯🎷', '祝鲲鹏十周年快乐。愿下一个十年乘风而上，未来可期。'),
      createLetter('anniversary-2', '十周年生日快乐', '隧帆风景', '祝鲲鹏公司十周年生日快乐。十年是一座里程碑，也是下一段旅程的起点。'),
      createLetter('anniversary-3', '十周年，嗨起来', '乂', '十周年，嗨起来！祝鲲鹏早日上市，也祝张导越来越有精神、越来越有底气。'),
      createLetter('anniversary-4', '鲲鹏展翅高飞', 'About', '张导加油，愿鲲鹏展翅高飞。十年积累的每一阵风，都会成为继续向上的力量。'),
      createLetter('anniversary-5', '扶摇直上九万里', '雨夜来听风', '鲲鹏一日同风起，扶摇直上九万里。愿这句诗，也成为下一个十年的好彩头。'),
      createLetter('anniversary-6', '砥砺前行，创造奇迹', '青柠的味道', '愿鲲鹏继续砥砺前行，创造新的奇迹。把曾经觉得不可能的事情，一件件做成。'),
      createLetter('anniversary-7', '感恩张导，感恩鲲鹏', '坤载苍灵', '感恩张导，感恩鲲鹏。谢谢团队用十年时间做产品、聚朋友，也谢谢这段旅程里每一次真诚相遇。'),
      createLetter('anniversary-8', '祝十周年大卖', '飞鱼', '祝鲲鹏十周年大卖。愿好产品被更多人看见，也愿所有付出都得到热烈的回应。'),
    ],
  },
  {
    id: 'future',
    number: '06',
    name: '写给未来',
    subtitle: '上市、二十周年与更大的梦想',
    tone: 'amber',
    letters: [
      createLetter('future-1', '早日实现上市梦想', 'Ming', '祝鲲鹏早日实现上市的梦想。愿每一步增长，都建立在好产品和用户信任之上。'),
      createLetter('future-2', '下个二十周年继续', 'double', '祝鲲鹏越来越好，下个二十周年我们继续。希望到那时回头看，今天只是故事刚刚展开的地方。'),
      createLetter('future-3', '做到世界一流', '别问干什么问就是在摸鱼', '张导，希望你一定把鲲鹏无限做到世界一流。梦想可以很大，脚下的产品和服务也要一步一步做好。'),
      createLetter('future-4', '超越一线品牌', '伟', '希望鲲鹏越做越好，早日拥有超越一线品牌的产品力和影响力。'),
      createLetter('future-5', '愿上市目标早日实现', '命运的赛勒克', '祝鲲鹏早日上市。愿这个目标不是终点，而是更好产品、更强团队的新起点。'),
      createLetter('future-6', '未来十年内上市', '吃饱就好', '加油，希望未来十年内实现上市。继续做长期的事，也继续听见真实用户的声音。'),
      createLetter('future-7', '未来可期', '王齐玄', '鲲鹏无限未来可期。愿未来的每一次更新，都比今天更稳定、更成熟，也更懂用户。'),
      createLetter('future-8', '越做越大，也越做越好', '维扬', '中不中奖都无所谓，我更想支持张导越做越大、鲲鹏越来越好。真正长久的品牌，值得耐心等待。'),
    ],
  },
  {
    id: 'product-wishes',
    number: '07',
    name: '产品心愿',
    subtitle: '把真实需求写给下一代产品',
    tone: 'copper',
    letters: [
      createLetter('product-wishes-1', '给外勤人员的流量套餐', '延时不睡', '希望能推出 500G 左右、上下行速度更适合日常工作的移动流量套餐，让外勤、驻场和临时办公的人有更合适的选择。'),
      createLetter('product-wishes-2', '期待以旧换新', 'Un Lai', '希望推出官方以旧换新政策，让购买不到一年的设备也能参与回收，换购新产品时按设备情况抵扣一部分金额。'),
      createLetter('product-wishes-3', '想要全球 eSIM', '熬夜艺术大师', '希望未来能有适合跨地区、跨国家使用的 eSIM 产品，让经常出差和旅行的人少一些换卡与网络切换的麻烦。'),
      createLetter('product-wishes-4', '全球流量卡也可以安排', '盲人调色师', '希望全球流量卡也能提上计划。便携设备如果能配上覆盖更广的网络服务，使用场景会真正打开。'),
      createLetter('product-wishes-5', '散热也值得继续加强', '小般', '希望下一代产品继续加强散热。性能、体积和温度之间的平衡，会直接影响长时间使用的稳定性。'),
      createLetter('product-wishes-6', '更强、更稳、更便携', 'Leo', '希望创造出更加强大、稳定的便携设备和流量卡。产品不只要跑得快，也要能在复杂环境里一直稳稳工作。'),
      createLetter('product-wishes-7', '大流量也需要平价选择', '123', '希望能有每月 500G 左右、价格更亲民的大流量套餐，让日常高频使用的人也能长期负担得起。'),
      createLetter(
        'product-wishes-8',
        '抽到不需要的，也能置换',
        '随缘',
        '希望盲盒能更贴近个人需求，或者加入奖品置换、碎片兑换机制。抽到自己完全用不上的东西会很可惜，如果能流转到真正需要的人手里，会更有意义。',
      ),
    ],
  },
  {
    id: 'good-sim',
    number: '08',
    name: '一张好卡',
    subtitle: '好卡、签名与收藏的心愿',
    tone: 'blue',
    letters: [
      createLetter('good-sim-1', '想要一套真正能用的组合', 'Dꫀડᴛʀꪮꪗ .', '希望能拥有 NBCPE-688 和一张合适的流量卡。设备、网络和套餐如果能被一起设计，用户选择时会省心很多。'),
      createLetter('good-sim-2', '我的第一台 CPE', '雪梨', '我的第一台 CPE 是 C2000PRO，现在准备换 MAX，只是还缺一张合适的卡。希望设备升级时，网络体验也能一起升级。'),
      createLetter('good-sim-3', '设备有了，卡从哪里来', '矩阵', '鲲鹏的设备已经有了，真正适合它的流量卡又该从哪里来？希望以后设备用户能有更清晰、更稳定的购卡渠道。'),
      createLetter('good-sim-4', '做梦也想要一张好卡', '顾小磊', '做梦也想要一张寂寞卡。期待的不只是名字和稀缺感，更是它在真实网络环境里的稳定表现。'),
      createLetter('good-sim-5', '就想要一张流量卡', 'Wzn、晚风（王者）', '设备的选择已经很多了，我现在最需要的就是一张流量卡。希望未来套餐简单一点、获取容易一点、使用也长久一点。'),
      createLetter('good-sim-6', '想要一张签名神卡', '心远', '希望获得一张张导签名的好卡，也祝张导事业蒸蒸日上，祝每一位鹏友都能稳定上网、永不断线。'),
      createLetter('good-sim-7', '我想要一张好卡', '张云平', '我想要一张真正适合自己所在地区的好卡。比起夸张的峰值速度，更希望日常一直稳定、套餐清楚透明。'),
      createLetter('good-sim-8', '希望能中到天火卡', '冷漠过人生', '希望我能中到天火卡，也希望未来好卡不只靠运气，更多普通用户能通过明确的方式获得。'),
      createLetter(
        'good-sim-9',
        '想把这句话留在卡套上',
        '阳光小玖',
        [
          '我想把三合一升级成赤金寂寞卡，也想请张导在赤金寂寞卡套上签名。',
          '如果可以，还想请你写下这句话：“这个世界就是个巨大的草台班子。”',
        ],
      ),
      createLetter(
        'good-sim-10',
        '收藏一份鲲鹏日的纪念',
        'Double',
        [
          '天火卡的名额不够了，所以想收藏一个卡套。寂寞卡是当时鲲鹏日活动拿到的，对我很有纪念意义。',
          '天火卡套：十周年纪念 + 张导签名。寂寞卡套：1208 鲲鹏日 + 张导签名。',
        ],
      ),
    ],
  },
  {
    id: 'blind-box-ideas',
    number: '09',
    name: '盲盒想法',
    subtitle: '惊喜、价格与规则都值得讨论',
    tone: 'rose',
    letters: [
      createLetter('blind-box-ideas-1', '愿赌服输，玩的是心跳', 'Josh', '盲盒玩的就是心跳。抽到好的自然开心，抽到普通的也愿意接受。规则清楚、奖品真实，惊喜才会让人觉得有趣。'),
      createLetter('blind-box-ideas-2', '周边也可以成为好奖品', '郭必瑜', '有些用户并不需要 4G 设备，比起用不上的产品，鼠标垫、水杯、音响、支架等实用周边，也可能是更合适的普通奖品。'),
      createLetter('blind-box-ideas-3', '按稀有度设置价格', '涛', '可以考虑设置不同价位的盲盒：价格越高，开出高等级奖品的概率也越高，让预算不同的用户都能找到适合自己的选择。'),
      createLetter('blind-box-ideas-4', '高端设备少量开放', '拾友叁', '高端设备可以小批量向老用户开放，卡类继续保留抽取；普通设备或库存产品则用更亲民的价格释放。分层处理，可能比放进同一个池子更清楚。'),
      createLetter('blind-box-ideas-5', '价格和奖池应该匹配', '没办法的网友', '如果价格更高，奖池也应该更集中在稀有和传说；如果价格较低，再搭配普通、稀有和传说的混合奖池。用户会更容易判断是否值得参与。'),
      createLetter('blind-box-ideas-6', '钱花得值，比价格低更重要', '今夜的风儿吹', '既然是十周年活动，价格高一点未必不能接受，但奖品要让人觉得这笔钱花得值。惊喜不能只靠宣传，也要靠真实价值支撑。'),
      createLetter('blind-box-ideas-7', '分两到三个等级', 'D.', '可以把盲盒分成两到三个等级。普通档保持较低门槛，稀有和传说档价格更高，奖池也更聚焦。'),
      createLetter('blind-box-ideas-8', '盲袋的核心是未知与期待', '就是彦祖呀', '买盲袋买的不是自选，而是未知、惊喜、运气和拆开的期待感。如果所有东西都能指定，盲袋本身也就失去了意义。'),
    ],
  },
  {
    id: 'keep-the-heart',
    number: '10',
    name: '不忘初心',
    subtitle: '赞美之外，也留下真实建议',
    tone: 'olive',
    letters: [
      createLetter('keep-the-heart-1', '越来越好，也不要忘记出发点', '啊九', '希望产品越来越好，也希望团队始终不忘初心。规模可以变大，真正解决用户问题的出发点不要变。'),
      createLetter('keep-the-heart-2', '少一点花哨，多一点实干', '盲鱼', '希望少一些花里胡哨，多做实事。用户最终记住的，还是产品是否稳定、服务是否可靠、承诺是否兑现。'),
      createLetter('keep-the-heart-3', '把中奖率和奖品数量说清楚', '000', '建议公示中奖率和各档奖品数量。规则越透明，参与的人越能做出理性判断，活动也会更有公信力。'),
      createLetter('keep-the-heart-4', '让更多人用得起', '爱笑的啊志', '我希望价格能更亲民一些，让更多真正有网络需求的人用得起。好产品走向更广的人群，本身也是一种成长。'),
      createLetter('keep-the-heart-5', '产品和卡都要继续进步', '诚实的贝贝', '希望产品越来越好，卡也越来越好用。硬件和网络服务一起进步，用户得到的才是完整体验。'),
      createLetter('keep-the-heart-6', '好坏都接受，规则要真诚', '㞮孞（初心）', '盲盒无论抽到好或坏我都可以接受，也希望规则始终真诚透明。祝鲲鹏无限越来越好。'),
      createLetter('keep-the-heart-7', '四个字送给下一个十年', 'Mr.zhang', '不忘初心。越是走得远、关注的人越多，越要记得最初想解决的是什么问题。'),
      createLetter('keep-the-heart-8', '砥砺前行，做第一', '仓库蜀黍', '砥砺前行，努力做第一。这里的第一，不只是销量和声量，也应该是产品体验与用户信任。'),
    ],
  },
]

const mailboxById = Object.fromEntries(
  ALL_MAILBOXES.map((mailbox) => [mailbox.id, mailbox]),
)

const selectLetters = (mailboxId, letterIds) => {
  const mailbox = mailboxById[mailboxId]
  return letterIds.map((letterId) =>
    mailbox.letters.find((letter) => letter.id === letterId),
  )
}

const tenYearsMailbox = {
  id: 'ten-years',
  number: '04',
  name: '十年以后',
  subtitle: '陪伴、祝福与更远的未来',
  tone: 'rose',
  letters: [
    ...selectLetters('companionship', [
      'companionship-2',
      'companionship-3',
      'companionship-8',
    ]),
    ...selectLetters('anniversary', [
      'anniversary-1',
      'anniversary-5',
    ]),
    ...selectLetters('future', [
      'future-1',
      'future-2',
      'future-8',
    ]),
  ],
}

export const MAILBOXES = [
  { ...mailboxById['mountains-and-seas'], number: '01' },
  { ...mailboxById['everyday-network'], number: '02' },
  {
    ...mailboxById['field-notes'],
    number: '03',
    letters: selectLetters('field-notes', [
      'field-notes-1',
      'field-notes-2',
      'field-notes-3',
      'field-notes-6',
      'field-notes-7',
      'field-notes-8',
    ]),
  },
  tenYearsMailbox,
  { ...mailboxById['product-wishes'], number: '05' },
  {
    ...mailboxById['good-sim'],
    number: '06',
    letters: selectLetters('good-sim', [
      'good-sim-1',
      'good-sim-2',
      'good-sim-3',
      'good-sim-5',
      'good-sim-6',
      'good-sim-7',
      'good-sim-9',
      'good-sim-10',
    ]),
  },
  { ...mailboxById['blind-box-ideas'], number: '07' },
  {
    ...mailboxById['keep-the-heart'],
    number: '08',
    name: '真话信箱',
    subtitle: '赞美之外，也留下真实建议',
    letters: selectLetters('keep-the-heart', [
      'keep-the-heart-1',
      'keep-the-heart-2',
      'keep-the-heart-3',
      'keep-the-heart-4',
      'keep-the-heart-5',
      'keep-the-heart-7',
    ]),
  },
]
