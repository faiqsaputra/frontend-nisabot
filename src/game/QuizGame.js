import Phaser from 'phaser';

const COLORS = {
  primary: 0x7a1025,
  primaryDark: 0x5f0d1d,
  primarySoft: 0xf6e5e8,
  primaryBorder: 0xe8cbd2,
  cream: 0xfbf8f6,
  white: 0xffffff,
  text: 0x1f2937,
  muted: 0x64748b,
  lightMuted: 0x94a3b8,
  border: 0xe5e7eb,
  success: 0x059669,
  successSoft: 0xecfdf5,
  danger: 0xe11d48,
  dangerSoft: 0xfff1f2,
  gold: 0xc99a2e,
  darkPanel: 0x37121d
};

const FONT = {
  display: 'Sora, Inter, Arial, sans-serif',
  body: 'Inter, Arial, sans-serif'
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const asArray = (value) => Array.isArray(value) ? value : [];

const asText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return String(value.label ?? value.text ?? value.title ?? value.value ?? fallback);
  return fallback;
};

const normalizeType = (value = 'choice') => {
  const type = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (['choice', 'multiple_choice', 'single_choice', 'multiplechoice', 'mcq', 'pilihan_ganda'].includes(type)) return 'choice';
  if (['true_false', 'boolean', 'benar_salah', 'truefalse'].includes(type)) return 'true_false';
  if (['ordering', 'order', 'sequence', 'sequencing', 'susun_urutan'].includes(type)) return 'ordering';
  if (['matching', 'match', 'pairing', 'pasangkan'].includes(type)) return 'matching';
  if (['case', 'case_analysis', 'case_study', 'analisis_kasus'].includes(type)) return 'case_analysis';

  return type;
};

export default class QuizGame extends Phaser.Scene {
  constructor() {
    super({ key: 'QuizGame' });

    this.question = null;
    this.onAnswer = null;
    this.validateAnswer = null;
    this.serverGraded = false;
    this.type = 'choice';

    this.root = null;
    this.background = null;

    this.gameWidth = 960;
    this.gameHeight = 560;

    this.isLocked = false;
    this.hasSubmitted = false;
    this.selectedOption = null;

    this.optionCards = [];
    this.orderItems = [];
    this.orderSelection = [];
    this.orderCards = [];

    this.matchLeft = [];
    this.matchRight = [];
    this.matchExpected = {};
    this.matchPairs = {};
    this.selectedLeft = null;
    this.matchLines = null;
    this.matchMistakes = 0;

    this.caseClues = [];
    this.caseOptions = [];
    this.caseSelected = null;
    this.caseEvidenceCount = 0;

    this.startedAt = 0;
    this.resizeBound = false;
  }

  init(data = {}) {
    this.question = data.question ?? this.registry.get('question') ?? null;
    this.onAnswer = data.onAnswer ?? this.registry.get('onAnswer') ?? null;
    this.validateAnswer = data.validateAnswer ?? this.registry.get('validateAnswer') ?? null;
    this.serverGraded = Boolean(data.serverGraded);
    this.type = normalizeType(this.question?.type ?? 'choice');

    this.isLocked = false;
    this.hasSubmitted = false;
    this.selectedOption = null;

    this.optionCards = [];
    this.orderItems = [];
    this.orderSelection = [];
    this.orderCards = [];

    this.matchLeft = [];
    this.matchRight = [];
    this.matchExpected = {};
    this.matchPairs = {};
    this.selectedLeft = null;
    this.matchLines = null;
    this.matchMistakes = 0;

    this.caseClues = [];
    this.caseOptions = [];
    this.caseSelected = null;
    this.caseEvidenceCount = 0;

    this.startedAt = Date.now();
  }

  create() {
    this.gameWidth = this.scale.gameSize.width || 960;
    this.gameHeight = this.scale.gameSize.height || 560;

    this.createCanvas();
    this.createAtmosphere();

    if (!this.question) {
      this.createEmptyState('Soal belum tersedia. Silakan kembali ke halaman kuis.');
      this.bindResize();
      return;
    }

    this.createHeader();

    switch (this.type) {
      case 'choice':
      case 'true_false':
        this.createChoiceChallenge();
        break;

      case 'ordering':
        this.createOrderingChallenge();
        break;

      case 'matching':
        this.createMatchingChallenge();
        break;

      case 'case_analysis':
        this.createCaseChallenge();
        break;

      default:
        this.createEmptyState(`Tipe soal "${this.type}" belum didukung.`);
        break;
    }

    this.bindResize();
  }

  bindResize() {
    if (this.resizeBound) return;

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.resizeBound = true;
  }

  createCanvas() {
    this.cameras.main.setBackgroundColor(COLORS.cream);

    this.background = this.add.graphics();
    this.background.fillStyle(COLORS.cream, 1);
    this.background.fillRoundedRect(0, 0, this.gameWidth, this.gameHeight, 24);

    this.root = this.add.container(0, 0);
  }

  createAtmosphere() {
    const orbA = this.add.circle(this.gameWidth - 26, 36, 105, COLORS.primarySoft, 0.45);
    const orbB = this.add.circle(24, this.gameHeight - 8, 78, COLORS.primaryBorder, 0.2);
    const orbC = this.add.circle(this.gameWidth * 0.54, this.gameHeight * 0.55, 210, COLORS.white, 0.28);

    [orbA, orbB, orbC].forEach((orb) => {
      orb.setBlendMode(Phaser.BlendModes.SCREEN);
      this.root.add(orb);
    });

    this.tweens.add({
      targets: orbA,
      x: this.gameWidth - 45,
      y: 49,
      scale: 1.07,
      duration: 4800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: orbB,
      x: 42,
      y: this.gameHeight - 19,
      scale: 1.1,
      duration: 5500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: orbC,
      alpha: 0.18,
      scale: 1.04,
      duration: 3900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  createHeader() {
    const title = asText(this.question?.title, this.getTypeTitle());
    const subtitle = asText(this.question?.question, this.getSubtitle());

    const badge = this.add.container(42, 28);

    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(COLORS.white, 0.95);
    badgeBg.lineStyle(1, COLORS.primaryBorder, 1);
    badgeBg.fillRoundedRect(0, 0, 158, 24, 12);
    badgeBg.strokeRoundedRect(0, 0, 158, 24, 12);

    const dot = this.add.circle(12, 12, 3.5, COLORS.primary);

    const badgeText = this.add.text(23, 12, this.getTypeBadge(), {
      fontFamily: FONT.display,
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#7A1025',
      letterSpacing: 0.7
    }).setOrigin(0, 0.5);

    badge.add([badgeBg, dot, badgeText]);

    const titleText = this.add.text(42, 65, title, {
      fontFamily: FONT.display,
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#1F2937',
      wordWrap: { width: this.gameWidth - 84 }
    }).setOrigin(0, 0);

    const questionText = this.add.text(42, 101, subtitle, {
      fontFamily: FONT.body,
      fontSize: '12px',
      color: '#64748B',
      lineSpacing: 4,
      wordWrap: { width: this.gameWidth - 84 }
    }).setOrigin(0, 0);

    this.root.add([badge, titleText, questionText]);

    [badge, titleText, questionText].forEach((item, index) => {
      item.setAlpha(0);

      this.tweens.add({
        targets: item,
        alpha: 1,
        y: item.y + 5,
        duration: 280,
        delay: index * 55,
        ease: 'Cubic.easeOut'
      });
    });
  }

  getTypeTitle() {
    return ({
      choice: 'Pilih Jawaban',
      true_false: 'Benar atau Salah',
      ordering: 'Susun Urutan',
      matching: 'Pasangkan Konsep',
      case_analysis: 'Analisis Kasus'
    })[this.type] ?? 'Interactive Quiz';
  }

  getTypeBadge() {
    return ({
      choice: 'PILIHAN GANDA',
      true_false: 'BENAR / SALAH',
      ordering: 'ORDER CHALLENGE',
      matching: 'MATCH CHALLENGE',
      case_analysis: 'CASE INVESTIGATION'
    })[this.type] ?? 'INTERACTIVE QUIZ';
  }

  getSubtitle() {
    return ({
      choice: 'Pilih jawaban yang paling tepat.',
      true_false: 'Tentukan apakah pernyataan berikut benar atau salah.',
      ordering: 'Pilih kartu sesuai urutan yang paling tepat.',
      matching: 'Pilih konsep di kiri, lalu pilih pasangannya di kanan.',
      case_analysis: 'Pahami situasi dan petunjuk, lalu tentukan keputusan.'
    })[this.type] ?? 'Kerjakan soal berikut.';
  }

  createSectionLabel(x, y, label) {
    const line = this.add.rectangle(x, y, 24, 2, COLORS.primary).setOrigin(0, 0.5);

    const text = this.add.text(x + 34, y, label, {
      fontFamily: FONT.display,
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#94A3B8',
      letterSpacing: 1
    }).setOrigin(0, 0.5);

    this.root.add([line, text]);
  }

  createChoiceChallenge() {
    const options = this.getOptions();

    if (!options.length && this.type === 'true_false') {
      options.push(
        { value: 'true', label: 'Benar' },
        { value: 'false', label: 'Salah' }
      );
    }

    if (!options.length) {
      this.createEmptyState('Soal ini belum memiliki pilihan jawaban.');
      return;
    }

    this.createSectionLabel(
      42,
      157,
      this.type === 'true_false' ? 'PILIH PERNYATAAN' : 'PILIH SATU JAWABAN'
    );

    const columns = options.length > 4 ? 2 : 1;
    const gapX = 14;
    const gapY = 10;
    const availableWidth = this.gameWidth - 84;
    const width = (availableWidth - gapX * (columns - 1)) / columns;
    const startY = this.type === 'true_false' ? 220 : 202;
    const availableHeight = this.gameHeight - startY - 78;
    const rowCount = Math.ceil(options.length / columns);
    const height = clamp(
      Math.floor((availableHeight - gapY * (rowCount - 1)) / rowCount),
      42,
      62
    );

    options.forEach((option, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;

      const x = 42 + column * (width + gapX) + width / 2;
      const y = startY + row * (height + gapY) + height / 2;

      const label = asText(
        option.label ?? option.text ?? option.title ?? option.value,
        `Pilihan ${index + 1}`
      );

      const card = this.createSelectableCard(
        x,
        y,
        width,
        height,
        label,
        String.fromCharCode(65 + index),
        index
      );

      card.option = option;
      card.on('pointerdown', () => this.selectOption(index));

      this.optionCards.push(card);
    });

    this.createActionButton(
      this.gameWidth - 118,
      this.gameHeight - 35,
      152,
      40,
      'Periksa Jawaban',
      () => this.submitChoice()
    );

    this.showHelperText('Pilih jawaban terlebih dahulu, lalu periksa jawabanmu.');
  }

  getOptions() {
    const options = asArray(this.question?.options).length
      ? this.question.options
      : asArray(this.question?.content?.options);

    return options.map((option, index) => {
      if (typeof option === 'string' || typeof option === 'number') {
        return {
          value: String(option),
          label: String(option),
          order: index
        };
      }

      return {
        ...option,
        value: option.value ?? option.id ?? String(index),
        label: option.label ?? option.text ?? option.title ?? option.value ?? `Pilihan ${index + 1}`
      };
    });
  }

  createSelectableCard(x, y, width, height, label, marker, index) {
    const card = this.add.container(x, y);

    const bg = this.add.graphics();

    bg.fillStyle(COLORS.white, 0.96);
    bg.lineStyle(1.3, COLORS.border, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 13);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 13);

    const markerBg = this.add.circle(-width / 2 + 22, 0, 12, COLORS.primarySoft, 1);

    const markerText = this.add.text(markerBg.x, 0, marker, {
      fontFamily: FONT.display,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#7A1025'
    }).setOrigin(0.5);

    const text = this.add.text(-width / 2 + 43, 0, label, {
      fontFamily: FONT.body,
      fontSize: '12px',
      fontStyle: '600',
      color: '#334155',
      wordWrap: { width: width - 64 },
      lineSpacing: 2
    }).setOrigin(0, 0.5);

    card.add([bg, markerBg, markerText, text]);

    card.setSize(width, height);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    card.background = bg;
    card.markerBg = markerBg;
    card.markerText = markerText;
    card.labelText = text;
    card.optionIndex = index;
    card.baseX = x;
    card.baseY = y;
    card.cardWidth = width;
    card.cardHeight = height;

    card.on('pointerover', () => {
      if (this.isLocked || card.optionIndex === this.selectedOption) return;

      this.tweens.add({
        targets: card,
        y: y - 2,
        duration: 110,
        ease: 'Quad.easeOut'
      });

      this.paintCard(card, 'hover');
    });

    card.on('pointerout', () => {
      if (this.isLocked || card.optionIndex === this.selectedOption) return;

      this.tweens.add({
        targets: card,
        y,
        duration: 110,
        ease: 'Quad.easeOut'
      });

      this.paintCard(card, 'default');
    });

    this.root.add(card);

    return card;
  }

  paintCard(card, state = 'default') {
    const style = {
      default: {
        fill: COLORS.white,
        stroke: COLORS.border,
        marker: COLORS.primarySoft,
        text: '#334155',
        markerText: '#7A1025'
      },
      hover: {
        fill: COLORS.cream,
        stroke: COLORS.primaryBorder,
        marker: COLORS.primarySoft,
        text: '#1F2937',
        markerText: '#7A1025'
      },
      selected: {
        fill: COLORS.primarySoft,
        stroke: COLORS.primary,
        marker: COLORS.primary,
        text: '#5F0D1D',
        markerText: '#FFFFFF'
      },
      correct: {
        fill: COLORS.successSoft,
        stroke: COLORS.success,
        marker: COLORS.success,
        text: '#065F46',
        markerText: '#FFFFFF'
      },
      wrong: {
        fill: COLORS.dangerSoft,
        stroke: COLORS.danger,
        marker: COLORS.danger,
        text: '#9F1239',
        markerText: '#FFFFFF'
      }
    }[state];

    if (!style) return;

    const width = card.cardWidth;
    const height = card.cardHeight;

    card.background.clear();
    card.background.fillStyle(style.fill, 1);
    card.background.lineStyle(
      ['selected', 'correct', 'wrong'].includes(state) ? 2 : 1.3,
      style.stroke,
      1
    );

    card.background.fillRoundedRect(-width / 2, -height / 2, width, height, 13);
    card.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 13);

    card.markerBg.setFillStyle(style.marker, 1);
    card.markerText.setColor(style.markerText);
    card.labelText.setColor(style.text);
  }

  selectOption(index) {
    if (this.isLocked) return;

    this.selectedOption = index;

    this.optionCards.forEach((card) => {
      this.paintCard(card, card.optionIndex === index ? 'selected' : 'default');
    });
  }

  submitChoice() {
    if (this.isLocked) return;

    if (this.selectedOption === null) {
      this.showInlineHint('Pilih salah satu jawaban terlebih dahulu.');
      return;
    }

    const option = this.getOptions()[this.selectedOption] ?? {
      value: this.type === 'true_false'
        ? String(this.selectedOption === 0)
        : String(this.selectedOption)
    };

    const correct = this.isOptionCorrect(option, this.selectedOption);

    this.finishChallenge(correct, {
      selectedIndex: this.selectedOption,
      selectedValue: option.value ?? option.id ?? this.selectedOption,
      selectedLabel: asText(option.label ?? option.text ?? option.value)
    });
  }

  createOrderingChallenge() {
    const content = this.question?.content ?? {};
    const rawItems = asArray(content.items);

    if (rawItems.length < 2) {
      this.createEmptyState('Tambahkan minimal dua item agar soal urutan dapat dimainkan.');
      return;
    }

    this.orderItems = rawItems.map((item, index) => ({
      index,
      value: typeof item === 'object'
        ? item.value ?? item.id ?? String(index)
        : String(index),
      label: asText(item, `Item ${index + 1}`)
    }));

    this.createSectionLabel(42, 157, 'SUSUN ITEM SESUAI URUTAN');

    this.showHelperText('Ketuk kartu mengikuti urutan yang benar. Ketuk lagi untuk membatalkan.');

    this.orderCards = [];

    const columns = this.orderItems.length > 4 ? 2 : 1;
    const gapX = 12;
    const gapY = 9;
    const availableWidth = this.gameWidth - 84;
    const width = (availableWidth - gapX * (columns - 1)) / columns;
    const startY = 202;
    const availableHeight = this.gameHeight - startY - 96;
    const rows = Math.ceil(this.orderItems.length / columns);
    const height = clamp(
      Math.floor((availableHeight - gapY * (rows - 1)) / rows),
      38,
      52
    );

    this.orderItems.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;

      const x = 42 + column * (width + gapX) + width / 2;
      const y = startY + row * (height + gapY) + height / 2;

      const card = this.createSelectableCard(
        x,
        y,
        width,
        height,
        item.label,
        '·',
        index
      );

      card.orderIndex = index;

      card.orderNumber = this.add.text(-width / 2 + 22, 0, '', {
        fontFamily: FONT.display,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#FFFFFF'
      }).setOrigin(0.5);

      card.add(card.orderNumber);

      card.removeAllListeners('pointerdown');
      card.on('pointerdown', () => this.toggleOrderItem(index));

      this.orderCards.push(card);
    });

    this.createActionButton(
      this.gameWidth - 118,
      this.gameHeight - 35,
      152,
      40,
      'Periksa Urutan',
      () => this.submitOrdering()
    );

    this.createActionButton(
      112,
      this.gameHeight - 35,
      112,
      40,
      'Ulangi',
      () => this.resetOrdering(),
      { secondary: true }
    );

    this.refreshOrderingCards();
  }

  toggleOrderItem(index) {
    if (this.isLocked) return;

    const existing = this.orderSelection.indexOf(index);

    if (existing >= 0) {
      this.orderSelection.splice(existing, 1);
    } else {
      this.orderSelection.push(index);
    }

    this.refreshOrderingCards();
  }

  refreshOrderingCards() {
    this.orderCards?.forEach((card, index) => {
      const position = this.orderSelection.indexOf(index);

      card.orderNumber.setText(position >= 0 ? String(position + 1) : '');
      card.markerText.setText(position >= 0 ? String(position + 1) : '·');

      this.paintCard(card, position >= 0 ? 'selected' : 'default');
    });
  }

  resetOrdering() {
    if (this.isLocked) return;

    this.orderSelection = [];
    this.refreshOrderingCards();
  }

  submitOrdering() {
    if (this.isLocked) return;

    if (this.orderSelection.length !== this.orderItems.length) {
      this.showInlineHint(`Urutkan semua ${this.orderItems.length} kartu terlebih dahulu.`);
      return;
    }

    const expected = this.serverGraded ? [] : this.getExpectedOrder();
    const correct = !this.serverGraded &&
      expected.length === this.orderSelection.length &&
      expected.every((value, index) => value === this.orderSelection[index]);

    const payload = { submittedOrder: [...this.orderSelection] };

    if (!this.serverGraded) payload.expectedOrder = expected;

    this.finishChallenge(correct, payload);
  }

  getExpectedOrder() {
    const answer = this.question?.answer;

    let values = Array.isArray(answer)
      ? answer
      : answer?.order ?? answer?.sequence ?? answer?.correctOrder ?? answer?.items ?? [];

    if (!Array.isArray(values)) return [];

    const normalized = values.map((value) => {
      if (Number.isInteger(value) && value >= 0 && value < this.orderItems.length) {
        return value;
      }

      return this.orderItems.findIndex((item) =>
        String(item.value) === String(value) || item.label === String(value)
      );
    });

    return normalized.every((value) => value >= 0) ? normalized : [];
  }

  createMatchingChallenge() {
    const content = this.question?.content ?? {};
    const leftItems = asArray(content.left);
    const rightItems = asArray(content.right);

    if (!leftItems.length || !rightItems.length) {
      this.createEmptyState('Data pasangan belum lengkap. Lengkapi kolom kiri dan kanan.');
      return;
    }

    this.createSectionLabel(42, 157, 'HUBUNGKAN PASANGAN YANG TEPAT');
    this.showHelperText('Pilih satu kartu di kiri, kemudian pasangannya di kanan.');

    const top = 216;
    const availableHeight = this.gameHeight - top - 78;

    const rowGap = Math.min(
      65,
      (availableHeight - 48) / Math.max(leftItems.length, rightItems.length, 1)
    );

    const cardHeight = clamp(rowGap - 8, 38, 52);
    const cardWidth = Math.min(350, (this.gameWidth - 140) / 2);
    const leftX = Math.max(cardWidth / 2 + 30, this.gameWidth * 0.25);
    const rightX = Math.min(this.gameWidth - cardWidth / 2 - 30, this.gameWidth * 0.75);

    this.matchLines = this.add.graphics();
    this.root.addAt(this.matchLines, 0);

    this.matchLeft = leftItems.map((item, index) =>
      this.createMatchCard(leftX, top + index * rowGap, cardWidth, cardHeight, item, 'left', index)
    );

    this.matchRight = rightItems.map((item, index) =>
      this.createMatchCard(rightX, top + index * rowGap, cardWidth, cardHeight, item, 'right', index)
    );

    this.matchExpected = this.getExpectedMatches();

    this.createActionButton(
      this.gameWidth - 118,
      this.gameHeight - 35,
      152,
      40,
      'Selesai',
      () => this.submitMatching()
    );
  }

  createMatchCard(x, y, width, height, item, side, index) {
    const card = this.createSelectableCard(
      x,
      y,
      width,
      height,
      asText(item, `${side === 'left' ? 'Konsep' : 'Pasangan'} ${index + 1}`),
      String(index + 1).padStart(2, '0'),
      index
    );

    card.side = side;
    card.matchIndex = index;
    card.matched = false;

    card.itemValue = typeof item === 'object'
      ? item.value ?? item.id ?? String(index)
      : String(index);

    card.baseX = x;
    card.baseY = y;

    card.removeAllListeners('pointerdown');

    card.on('pointerdown', () => {
      if (this.isLocked) return;

      if (card.matched) {
        this.removeMatch(card);
        return;
      }

      if (side === 'left') {
        this.selectLeftMatch(card);
      } else if (this.selectedLeft) {
        this.tryMatchRight(card);
      } else {
        this.showInlineHint('Pilih kartu di kolom kiri terlebih dahulu.');
      }
    });

    return card;
  }

  getExpectedMatches() {
    const answer = this.question?.answer;
    const pairs = answer?.pairs ?? answer?.matches ?? answer?.mapping ?? answer;
    const result = {};

    const resolveIndex = (value, items) => {
      if (Number.isInteger(value) && value >= 0 && value < items.length) {
        return value;
      }

      const token = value && typeof value === 'object'
        ? value.value ?? value.id ?? value.index
        : value;

      return items.findIndex((item, index) => {
        const itemValue = typeof item === 'object'
          ? item.value ?? item.id ?? String(index)
          : String(index);

        return String(itemValue) === String(token) || asText(item) === String(token);
      });
    };

    if (Array.isArray(pairs)) {
      pairs.forEach((pair, index) => {
        if (typeof pair === 'number' || typeof pair === 'string') {
          const right = resolveIndex(pair, asArray(this.question?.content?.right));

          if (right >= 0) result[index] = right;
        } else if (pair && typeof pair === 'object') {
          const leftValue = pair.leftIndex ?? pair.left ?? pair.from ?? index;
          const rightValue = pair.rightIndex ?? pair.right ?? pair.to;

          const left = resolveIndex(leftValue, asArray(this.question?.content?.left));
          const right = resolveIndex(rightValue, asArray(this.question?.content?.right));

          if (left >= 0 && right >= 0) result[left] = right;
        }
      });
    } else if (pairs && typeof pairs === 'object') {
      Object.entries(pairs).forEach(([leftValue, rightValue]) => {
        const left = resolveIndex(leftValue, asArray(this.question?.content?.left));
        const right = resolveIndex(rightValue, asArray(this.question?.content?.right));

        if (left >= 0 && right >= 0) result[left] = right;
      });
    }

    return result;
  }

  selectLeftMatch(card) {
    this.matchLeft.forEach((item) => {
      if (!item.matched) {
        this.paintCard(item, item === card ? 'selected' : 'default');
      }
    });

    this.selectedLeft = card;
  }

  tryMatchRight(rightCard) {
    const leftCard = this.selectedLeft;

    if (!leftCard || rightCard.matched) return;

    if (this.serverGraded) {
      this.matchPairs[leftCard.matchIndex] = rightCard.matchIndex;

      leftCard.matched = true;
      rightCard.matched = true;

      this.paintCard(leftCard, 'selected');
      this.paintCard(rightCard, 'selected');
      this.drawMatchLine(leftCard, rightCard);
      this.createSparkleBurst(leftCard.x, leftCard.y, 5);

      this.selectedLeft = null;

      if (Object.keys(this.matchPairs).length === this.matchLeft.length) {
        this.time.delayedCall(360, () => this.submitMatching());
      }

      return;
    }

    const expected = this.matchExpected[leftCard.matchIndex];
    const correct = expected === rightCard.matchIndex;

    if (!correct) {
      this.matchMistakes += 1;

      this.paintCard(leftCard, 'wrong');
      this.paintCard(rightCard, 'wrong');

      this.shake(leftCard);
      this.shake(rightCard);

      this.time.delayedCall(460, () => {
        if (!this.scene.isActive()) return;

        this.paintCard(leftCard, 'default');
        this.paintCard(rightCard, 'default');

        this.selectedLeft = null;
      });

      return;
    }

    this.matchPairs[leftCard.matchIndex] = rightCard.matchIndex;

    leftCard.matched = true;
    rightCard.matched = true;

    this.paintCard(leftCard, 'correct');
    this.paintCard(rightCard, 'correct');

    this.drawMatchLine(leftCard, rightCard);
    this.createSparkleBurst(leftCard.x, leftCard.y, 5);

    this.selectedLeft = null;

    if (Object.keys(this.matchPairs).length === this.matchLeft.length) {
      this.time.delayedCall(360, () => this.submitMatching());
    }
  }

  removeMatch(card) {
    const pairIndex = card.side === 'left'
      ? card.matchIndex
      : Number(Object.keys(this.matchPairs).find((key) => this.matchPairs[key] === card.matchIndex));

    if (!Number.isInteger(pairIndex) || pairIndex < 0) return;

    const rightIndex = this.matchPairs[pairIndex];

    delete this.matchPairs[pairIndex];

    const left = this.matchLeft[pairIndex];
    const right = this.matchRight[rightIndex];

    if (left) {
      left.matched = false;
      this.paintCard(left, 'default');
    }

    if (right) {
      right.matched = false;
      this.paintCard(right, 'default');
    }

    this.redrawMatchLines();
  }

  drawMatchLine(leftCard, rightCard) {
    if (!this.matchLines) return;

    const color = this.serverGraded ? COLORS.primary : COLORS.success;

    this.matchLines.lineStyle(3, color, 0.55);
    this.matchLines.beginPath();
    this.matchLines.moveTo(leftCard.x + leftCard.cardWidth / 2, leftCard.y);
    this.matchLines.lineTo(rightCard.x - rightCard.cardWidth / 2, rightCard.y);
    this.matchLines.strokePath();
  }

  redrawMatchLines() {
    this.matchLines?.clear();

    Object.entries(this.matchPairs).forEach(([left, right]) => {
      const leftCard = this.matchLeft[Number(left)];
      const rightCard = this.matchRight[Number(right)];

      if (leftCard && rightCard) this.drawMatchLine(leftCard, rightCard);
    });
  }

  submitMatching() {
    if (this.isLocked) return;

    if (Object.keys(this.matchPairs).length !== this.matchLeft.length) {
      this.showInlineHint('Pasangkan semua kartu terlebih dahulu.');
      return;
    }

    const keys = Object.keys(this.matchExpected);

    const correct = keys.length === this.matchLeft.length &&
      keys.every((key) => this.matchExpected[key] === this.matchPairs[key]) &&
      this.matchMistakes === 0;

    this.finishChallenge(correct, {
      pairs: { ...this.matchPairs },
      mistakes: this.matchMistakes
    });
  }

  createCaseChallenge() {
    const content = this.question?.content ?? {};
    const clues = asArray(content.clues);
    const options = this.getOptions();

    this.createCaseScenario(
      asText(content.scenario ?? this.question?.question, 'Baca situasi berikut dengan saksama.')
    );

    this.createSectionLabel(42, 250, 'PETUNJUK');

    if (!clues.length) {
      const clueHint = this.add.text(
        42,
        286,
        'Tidak ada petunjuk tambahan pada kasus ini.',
        {
          fontFamily: FONT.body,
          fontSize: '10px',
          color: '#94A3B8'
        }
      ).setOrigin(0, 0.5);

      this.root.add(clueHint);
    }

    const columns = Math.min(3, Math.max(1, clues.length));
    const gap = 10;
    const width = (this.gameWidth - 84 - gap * (columns - 1)) / columns;

    clues.slice(0, 3).forEach((clue, index) => {
      const x = 42 + index * (width + gap) + width / 2;
      const card = this.createClueCard(x, 305, width, 72, clue, index);

      this.caseClues.push(card);
    });

    this.createSectionLabel(42, 390, 'TENTUKAN JAWABAN');

    if (!options.length) {
      this.createEmptyState('Soal kasus ini belum memiliki pilihan jawaban.');
      return;
    }

    const optionColumns = options.length > 4 ? 3 : options.length > 2 ? 2 : 1;
    const optionGapX = 10;
    const optionGapY = 8;

    const optionWidth = (this.gameWidth - 84 - optionGapX * (optionColumns - 1)) / optionColumns;
    const rows = Math.ceil(options.length / optionColumns);

    const optionHeight = clamp(
      Math.floor((this.gameHeight - 449 - 58 - optionGapY * (rows - 1)) / rows),
      34,
      46
    );

    options.forEach((option, index) => {
      const row = Math.floor(index / optionColumns);
      const col = index % optionColumns;

      const x = 42 + col * (optionWidth + optionGapX) + optionWidth / 2;
      const y = 420 + row * (optionHeight + optionGapY) + optionHeight / 2;

      const card = this.createSelectableCard(
        x,
        y,
        optionWidth,
        optionHeight,
        asText(option.label ?? option.text ?? option.value, `Pilihan ${index + 1}`),
        String.fromCharCode(65 + index),
        index
      );

      card.option = option;
      card.on('pointerdown', () => this.selectCaseOption(index));

      this.caseOptions.push(card);
    });

    this.createActionButton(
      this.gameWidth - 118,
      this.gameHeight - 31,
      152,
      38,
      'Analisis Jawaban',
      () => this.submitCase()
    );
  }

  createCaseScenario(scenario) {
    const width = this.gameWidth - 84;

    const bg = this.add.graphics();

    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(42, 150, width, 78, 16);

    const label = this.add.text(60, 165, 'SITUASI', {
      fontFamily: FONT.display,
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#F4D8DE',
      letterSpacing: 1
    }).setOrigin(0, 0);

    const text = this.add.text(60, 187, scenario, {
      fontFamily: FONT.body,
      fontSize: '11px',
      color: '#FFFFFF',
      lineSpacing: 3,
      wordWrap: { width: width - 36 }
    }).setOrigin(0, 0);

    this.root.add([bg, label, text]);
  }

  createClueCard(x, y, width, height, clue, index) {
    const card = this.add.container(x, y);
    const bg = this.add.graphics();

    bg.fillStyle(COLORS.white, 1);
    bg.lineStyle(1, COLORS.border, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    const number = this.add.circle(-width / 2 + 18, -height / 2 + 18, 10, COLORS.primarySoft);

    const numberText = this.add.text(number.x, number.y, String(index + 1), {
      fontFamily: FONT.display,
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#7A1025'
    }).setOrigin(0.5);

    const title = this.add.text(-width / 2 + 34, -height / 2 + 18, asText(clue?.title, `Petunjuk ${index + 1}`), {
      fontFamily: FONT.display,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#7A1025',
      wordWrap: { width: width - 50 }
    }).setOrigin(0, 0.5);

    const detail = this.add.text(0, 12, 'Ketuk untuk membuka petunjuk', {
      fontFamily: FONT.body,
      fontSize: '9px',
      color: '#94A3B8',
      align: 'center',
      wordWrap: { width: width - 22 }
    }).setOrigin(0.5);

    card.add([bg, number, numberText, title, detail]);

    card.setSize(width, height);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    card.background = bg;
    card.detail = detail;
    card.clue = clue;
    card.revealed = false;

    card.on('pointerover', () => {
      if (!card.revealed && !this.isLocked) {
        this.tweens.add({
          targets: card,
          y: y - 2,
          duration: 100
        });
      }
    });

    card.on('pointerout', () => {
      if (!card.revealed) {
        this.tweens.add({
          targets: card,
          y,
          duration: 100
        });
      }
    });

    card.on('pointerdown', () => {
      if (this.isLocked || card.revealed) return;

      card.revealed = true;
      this.caseEvidenceCount += 1;

      card.background.clear();
      card.background.fillStyle(COLORS.primarySoft, 1);
      card.background.lineStyle(1.4, COLORS.primaryBorder, 1);
      card.background.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      card.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

      card.detail.setText(asText(clue?.text ?? clue?.description, 'Tidak ada informasi tambahan.'));
      card.detail.setColor('#475569');
      card.detail.setFontSize('9px');

      this.createSparkleBurst(card.x, card.y, 5);
    });

    this.root.add(card);

    return card;
  }

  selectCaseOption(index) {
    if (this.isLocked) return;

    this.caseSelected = index;

    this.caseOptions.forEach((card) => {
      this.paintCard(card, card.optionIndex === index ? 'selected' : 'default');
    });
  }

  submitCase() {
    if (this.isLocked) return;

    if (this.caseSelected === null) {
      this.showInlineHint('Pilih keputusan terlebih dahulu.');
      return;
    }

    const option = this.getOptions()[this.caseSelected];

    this.finishChallenge(
      this.isOptionCorrect(option, this.caseSelected),
      {
        selectedIndex: this.caseSelected,
        selectedValue: option?.value ?? option?.id ?? this.caseSelected,
        selectedLabel: asText(option?.label ?? option?.text ?? option?.value),
        revealedClues: this.caseEvidenceCount
      }
    );
  }

  isOptionCorrect(option, index) {
    if (option?.isCorrect === true || option?.correct === true) return true;

    const allOptions = this.getOptions();

    const hasCorrectFlag = allOptions.some(
      (item) => item?.isCorrect === true || item?.correct === true
    );

    if (hasCorrectFlag && (option?.isCorrect === false || option?.correct === false)) {
      return false;
    }

    const answer = this.question?.answer;

    if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
      if (
        Array.isArray(answer.correctValues) &&
        answer.correctValues.some((value) => this.sameAnswer(value, option, index))
      ) {
        return true;
      }

      if (
        Array.isArray(answer.correctOptionIds) &&
        answer.correctOptionIds.some((value) => String(value) === String(option?.id))
      ) {
        return true;
      }

      const token = answer.value ??
        answer.correctValue ??
        answer.optionId ??
        answer.correctOptionId ??
        answer.correctOptionIndex ??
        answer.correctOption ??
        answer.correctAnswer ??
        answer.answer ??
        answer.index ??
        answer.correctIndex;

      if (token !== undefined) {
        return this.sameAnswer(token, option, index);
      }
    }

    if (Array.isArray(answer)) {
      return answer.some((value) => this.sameAnswer(value, option, index));
    }

    if (answer !== undefined && answer !== null) {
      return this.sameAnswer(answer, option, index);
    }

    return false;
  }

  sameAnswer(token, option, index) {
    if (token && typeof token === 'object') {
      token = token.value ?? token.id ?? token.optionId ?? token.index ?? token.answer;
    }

    if (token === undefined || token === null) return false;

    const candidates = [
      option?.value,
      option?.id,
      option?.label,
      option?.text,
      String(index),
      index,
      String.fromCharCode(65 + index)
    ];

    return candidates.some((candidate) =>
      candidate !== undefined &&
      String(candidate).trim().toLowerCase() === String(token).trim().toLowerCase()
    );
  }

  createActionButton(x, y, width, height, label, onClick, options = {}) {
    const button = this.add.container(x, y);
    const bg = this.add.graphics();

    const fill = options.secondary ? COLORS.white : COLORS.primary;
    const stroke = options.secondary ? COLORS.primaryBorder : COLORS.primary;

    bg.fillStyle(fill, 1);
    bg.lineStyle(1, stroke, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);

    const text = this.add.text(0, 0, label, {
      fontFamily: FONT.display,
      fontSize: '10px',
      fontStyle: 'bold',
      color: options.secondary ? '#7A1025' : '#FFFFFF'
    }).setOrigin(0.5);

    button.add([bg, text]);

    button.setSize(width, height);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    button.on('pointerover', () => {
      if (!this.isLocked) {
        this.tweens.add({
          targets: button,
          scale: 1.025,
          duration: 100
        });
      }
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scale: 1,
        duration: 100
      });
    });

    button.on('pointerdown', () => {
      if (!this.isLocked) onClick?.();
    });

    this.root.add(button);

    return button;
  }

  showHelperText(message) {
    const text = this.add.text(42, this.gameHeight - 35, message, {
      fontFamily: FONT.body,
      fontSize: '9px',
      color: '#94A3B8',
      wordWrap: { width: Math.max(160, this.gameWidth - 260) }
    }).setOrigin(0, 0.5);

    this.root.add(text);
  }

  showInlineHint(message) {
    const hint = this.add.text(this.gameWidth / 2, this.gameHeight - 75, message, {
      fontFamily: FONT.body,
      fontSize: '10px',
      fontStyle: '600',
      color: '#7A1025',
      backgroundColor: '#F6E5E8',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
      align: 'center',
      wordWrap: { width: this.gameWidth - 100 }
    }).setOrigin(0.5);

    this.root.add(hint);

    this.tweens.add({
      targets: hint,
      alpha: 0,
      y: hint.y - 6,
      delay: 950,
      duration: 250,
      onComplete: () => hint.destroy()
    });
  }

  finishChallenge(correct, payload = {}) {
    if (this.hasSubmitted) return;

    this.hasSubmitted = true;
    this.isLocked = true;

    const submittedAt = Date.now();

    const baseResult = {
      correct: Boolean(correct),
      type: this.type,
      questionId: this.question?.id ?? null,
      answer: payload,
      points: Boolean(correct) ? Number(this.question?.points ?? 1) : 0,
      explanation: asText(this.question?.explanation, ''),
      durationMs: Math.max(0, submittedAt - this.startedAt),
      timestamp: submittedAt
    };

    if (typeof this.validateAnswer === 'function') {
      Promise.resolve()
        .then(() => this.validateAnswer({
          questionId: baseResult.questionId,
          type: this.type,
          answer: payload,
          durationMs: baseResult.durationMs
        }))
        .then((response) => {
          const data = response?.data ?? response ?? {};
          const serverCorrect = data.correct ?? data.isCorrect ?? data.result?.correct;

          const result = {
            ...baseResult,
            ...data,
            correct: Boolean(serverCorrect),
            answer: payload,
            points: Number(
              data.points ??
              data.earnedPoints ??
              (serverCorrect ? baseResult.points : 0)
            ),
            explanation: asText(
              data.explanation ?? data.result?.explanation ?? baseResult.explanation,
              ''
            )
          };

          this.showResult(result);
          this.notifyAnswer(result);
        })
        .catch((error) => {
          this.hasSubmitted = false;
          this.isLocked = false;

          this.showInlineHint(
            error?.message || 'Jawaban belum berhasil dikirim. Coba lagi.'
          );
        });

      return;
    }

    this.showResult(baseResult);
    this.notifyAnswer(baseResult);
  }

  notifyAnswer(result) {
    this.time.delayedCall(950, () => {
      if (typeof this.onAnswer === 'function') {
        this.onAnswer(result);
      }
    });
  }

  showResult(result) {
    const width = Math.min(450, this.gameWidth - 48);
    const height = result.explanation ? 194 : 148;

    const panel = this.add.container(this.gameWidth / 2, this.gameHeight / 2);

    const shadow = this.add.graphics();
    shadow.fillStyle(COLORS.darkPanel, 0.12);
    shadow.fillRoundedRect(-width / 2 + 4, -height / 2 + 7, width, height, 22);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.white, 1);
    bg.lineStyle(1, result.correct ? 0xc4f0df : 0xf7cbd5, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 22);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 22);

    const iconColor = result.correct ? COLORS.success : COLORS.danger;

    const icon = this.add.circle(
      0,
      -height / 2 + 37,
      20,
      result.correct ? COLORS.successSoft : COLORS.dangerSoft,
      1
    );

    const symbol = this.add.text(0, icon.y, result.correct ? '✓' : '!', {
      fontFamily: FONT.display,
      fontSize: '22px',
      fontStyle: 'bold',
      color: `#${iconColor.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);

    const title = this.add.text(
      0,
      -height / 2 + 70,
      result.correct ? 'Jawaban tepat!' : 'Belum tepat',
      {
        fontFamily: FONT.display,
        fontSize: '18px',
        fontStyle: 'bold',
        color: result.correct ? '#047857' : '#9F1239'
      }
    ).setOrigin(0.5);

    const detail = this.add.text(
      0,
      -height / 2 + 98,
      result.correct
        ? `Kamu mendapatkan ${result.points} poin.`
        : 'Tetap semangat, pelajari pembahasannya ya.',
      {
        fontFamily: FONT.body,
        fontSize: '11px',
        color: '#64748B',
        align: 'center',
        wordWrap: { width: width - 42 }
      }
    ).setOrigin(0.5);

    panel.add([shadow, bg, icon, symbol, title, detail]);

    if (result.explanation) {
      const explanation = this.add.text(0, -height / 2 + 132, result.explanation, {
        fontFamily: FONT.body,
        fontSize: '10px',
        color: '#475569',
        align: 'center',
        lineSpacing: 3,
        wordWrap: { width: width - 42 }
      }).setOrigin(0.5, 0);

      panel.add(explanation);
    }

    panel.setDepth(100);
    panel.setAlpha(0);
    panel.setScale(0.94);

    this.root.add(panel);

    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut'
    });

    this.createSparkleBurst(
      this.gameWidth / 2,
      this.gameHeight / 2 - height / 2 + 38,
      result.correct ? 16 : 5
    );
  }

  createEmptyState(message) {
    const center = this.add.container(
      this.gameWidth / 2,
      this.gameHeight / 2 + 28
    );

    const circle = this.add.circle(0, -20, 34, COLORS.primarySoft, 1);

    const symbol = this.add.text(0, -20, '?', {
      fontFamily: FONT.display,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#7A1025'
    }).setOrigin(0.5);

    const text = this.add.text(0, 40, message, {
      fontFamily: FONT.body,
      fontSize: '11px',
      color: '#64748B',
      align: 'center',
      wordWrap: { width: Math.min(440, this.gameWidth - 90) }
    }).setOrigin(0.5);

    center.add([circle, symbol, text]);
    this.root.add(center);

    return center;
  }

  createSparkleBurst(x, y, count = 10) {
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(28, 78);

      const particle = this.add.text(
        x,
        y,
        index % 2 === 0 ? '✦' : '•',
        {
          fontFamily: FONT.display,
          fontSize: index % 2 === 0 ? '12px' : '8px',
          color: index % 3 === 0 ? '#C99A2E' : '#7A1025'
        }
      ).setOrigin(0.5).setDepth(110);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        rotation: Phaser.Math.FloatBetween(-1.2, 1.2),
        duration: Phaser.Math.Between(400, 750),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  shake(target) {
    if (!target) return;

    const originalX = target.x;

    this.tweens.add({
      targets: target,
      x: originalX + 5,
      duration: 45,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (target.active) target.x = originalX;
      }
    });
  }

  handleResize(gameSize) {
    if (!gameSize || !this.background) return;

    this.gameWidth = gameSize.width || this.gameWidth;
    this.gameHeight = gameSize.height || this.gameHeight;

    this.background.clear();
    this.background.fillStyle(COLORS.cream, 1);
    this.background.fillRoundedRect(0, 0, this.gameWidth, this.gameHeight, 24);
  }

  shutdown() {
    if (this.resizeBound) {
      this.scale.off('resize', this.handleResize, this);
      this.resizeBound = false;
    }

    this.tweens.killAll();
  }
}