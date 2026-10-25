/* Categorias (grupos + subcategorias), bancos e cores. */
(function (G) {
  'use strict';

  // kind: 'e' despesa, 'r' receita. bucket: ess (essencial), non (não essencial), inv (investimento)
  var GROUPS = [
    { id: 'alimentacao', name: 'Alimentação', color: '#ec8132', icon: 'cart', kind: 'e', bucket: 'ess' },
    { id: 'compras', name: 'Compras', color: '#e0509c', icon: 'bag', kind: 'e', bucket: 'non' },
    { id: 'saude', name: 'Saúde e bem-estar', color: '#3fb27f', icon: 'heartpulse', kind: 'e', bucket: 'ess' },
    { id: 'digitais', name: 'Serviços digitais', color: '#a55cf0', icon: 'monitor', kind: 'e', bucket: 'non' },
    { id: 'transporte', name: 'Transporte', color: '#e8a02f', icon: 'car', kind: 'e', bucket: 'ess' },
    { id: 'moradia', name: 'Moradia', color: '#6b64e8', icon: 'house', kind: 'e', bucket: 'ess' },
    { id: 'lazer', name: 'Lazer e entretenimento', color: '#4a7cf0', icon: 'umbrella', kind: 'e', bucket: 'non' },
    { id: 'educacao', name: 'Educação', color: '#13a8a0', icon: 'graduation', kind: 'e', bucket: 'ess' },
    { id: 'financas', name: 'Finanças', color: '#45b866', icon: 'cash', kind: 'e', bucket: 'inv' },
    { id: 'receitas', name: 'Receitas', color: '#15a34a', icon: 'moneyin', kind: 'r', bucket: null },
    { id: 'outros', name: 'Outros', color: '#8794a3', icon: 'tag', kind: 'e', bucket: 'non' }
  ];

  // [id, nome, ícone]
  var SUBS = {
    alimentacao: [
      ['supermercado', 'Supermercado', 'cart'], ['alimentos', 'Alimentos e bebidas', 'coffee'],
      ['restaurantes', 'Restaurantes, bares e lanchonetes', 'utensils'], ['delivery', 'Delivery de alimentos', 'scooter']
    ],
    compras: [
      ['compras', 'Compras', 'bag'], ['compras-online', 'Compras online', 'globe'], ['eletronicos', 'Eletrônicos', 'phone'],
      ['pet', 'Pet Shops e veterinários', 'paw'], ['vestuario', 'Vestuário', 'shirt'], ['infantis', 'Artigos infantis', 'baby'],
      ['livraria', 'Livraria', 'book'], ['esportivos', 'Artigos esportivos', 'target'], ['papelaria', 'Papelaria', 'notebook'],
      ['cashback', 'Cashback', 'handcoins']
    ],
    saude: [
      ['saude', 'Saúde', 'heart'], ['saude-bem-estar', 'Saúde e bem-estar', 'heart'], ['academia', 'Academia e centros de lazer', 'dumbbell'],
      ['esportes', 'Prática de esportes', 'bike'], ['bem-estar', 'Bem-estar', 'palm'], ['dentista', 'Dentista', 'smile'],
      ['farmacia', 'Farmácia', 'pill'], ['otica', 'Ótica', 'glasses'], ['hospitais', 'Hospitais, clínicas e laboratórios', 'hospital'],
      ['plano-saude', 'Plano de saúde', 'shield']
    ],
    digitais: [
      ['servicos-digitais', 'Serviços digitais', 'monitor'], ['jogos', 'Jogos e videogames', 'gamepad'],
      ['streaming-video', 'Streaming de vídeo', 'play'], ['streaming-musica', 'Streaming de música', 'music']
    ],
    transporte: [
      ['transporte', 'Transporte', 'car'], ['taxi', 'Táxi e transporte privado urbano', 'taxi'], ['publico', 'Transporte público', 'train'],
      ['aluguel-veiculos', 'Aluguel de veículos', 'car'], ['aluguel-bike', 'Aluguel de bicicletas', 'bike'],
      ['automotivos', 'Serviços automotivos', 'wrench'], ['gasolina', 'Postos de gasolina', 'fuel'], ['estacionamento', 'Estacionamentos', 'parking'],
      ['pedagios', 'Pedágios e pagamentos no veículo', 'ticket'], ['taxas-veiculos', 'Taxas e impostos sobre veículos', 'receipt'],
      ['manutencao-veiculos', 'Manutenção de veículos', 'wrench'], ['multas', 'Multas de trânsito', 'alert']
    ],
    moradia: [
      ['moradia', 'Moradia', 'house'], ['aluguel', 'Aluguel', 'building'], ['condominio', 'Condomínio', 'building'],
      ['utilidade', 'Serviços de utilidade pública', 'wrench'], ['agua', 'Água', 'droplets'], ['eletricidade', 'Eletricidade', 'zap'],
      ['gas', 'Gás', 'flame'], ['utensilios', 'Utensílios para casa', 'lamp'], ['manutencao-casa', 'Manutenção da casa', 'hammer'],
      ['impostos-moradia', 'Impostos sobre moradia', 'receipt'], ['telecom', 'Telecomunicação', 'wifi'], ['internet', 'Internet', 'wifi'],
      ['celular', 'Celular', 'phone'], ['tv', 'TV', 'tv']
    ],
    lazer: [
      ['lazer', 'Lazer', 'umbrella'], ['viagens', 'Viagens', 'plane'], ['aeroportos', 'Aeroportos e cias. aéreas', 'plane'],
      ['hospedagem', 'Hospedagem', 'bed'], ['milhagem', 'Programas de milhagem', 'card'], ['onibus', 'Passagem de ônibus', 'bus'],
      ['bilhetes', 'Bilhetes', 'ticket'], ['estadios', 'Estádios e arenas', 'flag'], ['cinema', 'Cinema, Teatro e Concertos', 'drama']
    ],
    educacao: [
      ['educacao', 'Educação', 'graduation'], ['mensalidade', 'Mensalidade escolar', 'school'], ['cursos', 'Cursos', 'book'],
      ['material', 'Material escolar', 'notebook']
    ],
    financas: [
      ['investimentos', 'Investimentos', 'trendingup'], ['investimento-auto', 'Investimento automático', 'repeat'],
      ['renda-fixa', 'Renda fixa', 'piggy'], ['fundos', 'Fundos multimercado', 'chart'], ['renda-variavel', 'Renda variável', 'trendingup'],
      ['ajuste-margem', 'Ajuste de margem', 'scale'], ['juros-dividendos', 'Juros de rendimentos de dividendos', 'coins'],
      ['pensao', 'Pensão', 'handheart'], ['emprestimos', 'Empréstimos e financiamentos', 'bank'], ['taxas-bancarias', 'Taxas bancárias', 'receipt'],
      ['transf-titularidade', 'Transferência mesma titularidade', 'swap'], ['transf-titularidade-din', 'Transferência mesma titularidade - Dinheiro', 'swap'],
      ['transf-titularidade-pix', 'Transferência mesma titularidade - PIX', 'swap'], ['transf-titularidade-ted', 'Transferência mesma titularidade - TED', 'swap'],
      ['transferencias', 'Transferências', 'swap'], ['transf-boleto', 'Transferência - Boleto bancário', 'swap'],
      ['transf-din', 'Transferência - Dinheiro', 'swap'], ['transf-pix', 'Transferência - PIX', 'swap'], ['transf-ted', 'Transferência - TED', 'swap'],
      ['fatura', 'Fatura de cartão', 'card'], ['ajuste', 'Ajuste de saldo', 'scale']
    ],
    receitas: [
      ['salario', 'Salário', 'cash'], ['adiantamento', 'Adiantamento salário', 'cash'], ['freelance', 'Freelance', 'briefcase'],
      ['rendimentos', 'Rendimentos', 'trendingup'], ['reembolso', 'Reembolso', 'refresh'], ['presente-rec', 'Presente recebido', 'gift'],
      ['vendas', 'Vendas', 'package'], ['outras-receitas', 'Outras receitas', 'coins']
    ],
    outros: [
      ['sem-categoria', 'Sem categoria', 'tag'], ['doacoes', 'Doações', 'handheart'], ['presentes', 'Presentes', 'gift'],
      ['impostos', 'Impostos e taxas', 'receipt'], ['outros', 'Outros', 'tag']
    ]
  };

  var gmap = {}, cmap = {}, list = [];
  GROUPS.forEach(function (g) { gmap[g.id] = g; });
  GROUPS.forEach(function (g) {
    SUBS[g.id].forEach(function (s) {
      var c = { id: s[0], g: g.id, name: s[1], icon: s[2], custom: false };
      cmap[c.id] = c; list.push(c);
    });
  });

  var Cat = {
    groups: GROUPS,
    group: function (id) { return gmap[id] || gmap.outros; },
    /** Registra categorias criadas pelo usuário. */
    setCustom: function (arr) {
      list = list.filter(function (c) { return !c.custom; });
      Object.keys(cmap).forEach(function (k) { if (cmap[k].custom) delete cmap[k]; });
      (arr || []).forEach(function (s) {
        if (!gmap[s.g]) return;
        var c = { id: s.id, g: s.g, name: s.name, icon: s.icon || gmap[s.g].icon, custom: true };
        cmap[c.id] = c; list.push(c);
      });
    },
    get: function (id) { return cmap[id] || cmap['sem-categoria']; },
    all: function () { return list; },
    inGroup: function (gid) { return list.filter(function (c) { return c.g === gid; }); },
    color: function (id) { return Cat.group(Cat.get(id).g).color; },
    /** Grupos oferecidos para cada tipo de lançamento. */
    groupsFor: function (type) {
      return GROUPS.filter(function (g) {
        if (type === 'income') return g.id === 'receitas' || g.id === 'financas' || g.id === 'outros';
        return g.id !== 'receitas';
      });
    }
  };

  var BANKS = [
    { name: 'Nubank', color: '#8a05be', fg: '#fff', short: 'nu' },
    { name: 'Itaú', color: '#ff6200', fg: '#fff', short: 'itaú' },
    { name: 'Bradesco', color: '#cc092f', fg: '#fff', short: 'Br' },
    { name: 'Santander', color: '#e60000', fg: '#fff', short: 'Sa' },
    { name: 'Caixa', color: '#0b6fb5', fg: '#fff', short: 'Cx' },
    { name: 'Banco do Brasil', color: '#f7d417', fg: '#142a6b', short: 'BB' },
    { name: 'Inter', color: '#ff7a00', fg: '#fff', short: 'in' },
    { name: 'C6 Bank', color: '#242424', fg: '#fff', short: 'C6' },
    { name: 'Next', color: '#00d96a', fg: '#04301a', short: 'Nx' },
    { name: 'PicPay', color: '#21c25e', fg: '#fff', short: 'Pp' },
    { name: 'Mercado Pago', color: '#00a7e1', fg: '#fff', short: 'MP' },
    { name: 'Carteira', color: '#7a8a82', fg: '#fff', short: '$' }
  ];

  var COLORS = ['#8a05be', '#ff6200', '#cc092f', '#0b6fb5', '#f7d417', '#ff7a00', '#242424', '#00d96a', '#21c25e', '#00a7e1', '#6b64e8', '#e0509c', '#7a8a82'];

  /** Cor de texto legível sobre uma cor de fundo. */
  function fgOn(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 165 ? '#1b2a22' : '#ffffff';
  }

  G.Cat = Cat;
  G.BANKS = BANKS;
  G.COLORS = COLORS;
  G.fgOn = fgOn;
})(window);
