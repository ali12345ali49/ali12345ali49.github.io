
(function () {
  var SEEN_KEY = "bjOnboardingSeen";
  var welcomeOverlay = document.getElementById("onb-welcome-overlay");
  var blocker = document.getElementById("onb-blocker");
  var spot = document.getElementById("onb-spot");
  var tip = document.getElementById("onb-tip");
  var tipStepEl = document.getElementById("onb-tip-step");
  var tipTitleEl = document.getElementById("onb-tip-title");
  var tipTextEl = document.getElementById("onb-tip-text");
  var tipNoteEl = document.getElementById("onb-tip-note");
  var tipNextBtn = document.getElementById("onb-tip-next");
  var tipSkipBtn = document.getElementById("onb-tip-skip");
  var tipDetailBtn = document.getElementById("onb-tip-detail");
  var tipPrevBtn = document.getElementById("onb-tip-prev");

  function markSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {} }

  function findByExactText(list, text) {
    for (var i = 0; i < list.length; i++) {
      if ((list[i].textContent || "").trim() === text) return list[i];
    }
    return null;
  }
  function bottomNavBtn(label) {
    var bars = document.querySelectorAll('div[style*="bottom: 0px"][style*="position: fixed"]');
    for (var i = 0; i < bars.length; i++) {
      var found = findByExactText(bars[i].querySelectorAll("button"), label);
      if (found) return found;
    }
    return findByExactText(document.querySelectorAll("button"), label);
  }
  function settingsGearBtn() {
    var header = document.querySelector('div[style*="position: sticky"]');
    if (!header) return null;
    var btns = header.querySelectorAll("button");
    return btns.length ? btns[btns.length - 1] : null;
  }
  function byId(id) {
    // If this id belongs to one of the collapsible/scrollable icons up top
    // (see the bjrow script further down), make sure it's actually visible
    // before handing it back — otherwise the tour would measure a
    // display:none element (width/height 0) and silently skip the step.
    if (window.bjRowRevealIcon) { try { window.bjRowRevealIcon(id); } catch (e) {} }
    return document.getElementById(id);
  }

  var quickSteps = [
    { get: function () { return bottomNavBtn("تقویم"); },
      title: "تقویم روزانه",
      text: "تقویم شمسی ماهانه؛ روزهایی که توش کار، عادت یا یادداشت ثبت کردی با یه نقطه‌ی رنگی مشخص می‌شن. روی هر روز بزن تا واردش بشی؛ اونجا هر روز به ۴ ربع ماتریس آیزنهاور تقسیم می‌شه (مثلاً «مهم و ضروری») و کارهای اون روز رو زیر ربع مربوطه می‌نویسی، با امکان تنظیم زمان، مکان و یادآوری.",
      detail: openCalendarDetailTour },
    { get: function () { return bottomNavBtn("اهداف"); },
      title: "اهداف",
      text: "اینجا هدف می‌سازی، به یکی از ۴ ربع وصلش می‌کنی و پیشرفتش رو با نوار درصد دنبال می‌کنی.",
      detail: openGoalsDetailTour },
    { get: function () { return bottomNavBtn("عادت‌ها"); },
      title: "عادت‌ها",
      text: "عادت‌های روزانه‌ت رو اینجا تعریف و ردیابی کن؛ دو مدلی: دایره‌ای (رنگی) یا عادت ساده (عددی).",
      detail: openHabitsDetailTour },
    { get: function () { return byId("pnd-fab") || bottomNavBtn("ناتمام‌ها"); },
      title: "ناتمام‌ها",
      text: "کارهایی که توی روزهای قبل تیک نزدی، خودکار میان اینجا تا تیکشون بزنی، حذفشون کنی یا به روز دیگه‌ای منتقلشون کنی.",
      detail: openPendingDetailTour },
    { get: function () { return settingsGearBtn(); },
      title: "تنظیمات",
      text: "از اینجا سهم هر ربع از کارهای روز، پشتیبان‌گیری (ابری یا فایل)، دسترسی به میکروفون/دوربین/گالری، سبک آیکون‌ها، تم و حالت روز/شب، سبک نمایش کارهای روزانه و تنظیمات عمومی رو مدیریت می‌کنی.",
      detail: openSettingsDetailTour }
  ];

  var fullSteps = [
    { get: function () { return bottomNavBtn("تقویم"); },
      title: "تقویم — با مثال",
      text: "این صفحه‌ایه که اول ورود به اپ می‌بینیش: یه تقویم شمسی ماهانه که روزهایی که توش کار، عادت یا یادداشت ثبت کردی رو با یه نقطه‌ی رنگی کوچیک مشخص می‌کنه.\\n\\nمثال: با فلش‌های کنار اسم ماه (مثلاً «مهر ۱۴۰۴») بین ماه‌ها جلو و عقب برو؛ روی هر روز که بزنی، وارد همون روز می‌شی و کارها/عادت‌ها/یادداشتش رو می‌بینی یا ویرایش می‌کنی. دکمه‌ی «رفتن به امروز» همیشه سریع برت می‌گردونه به روز جاری. پایین تقویم هم یه لیست کوتاه از کارهای زمان‌دارِ «این هفته» و «ماه پیش رو» می‌بینی، برای مرور سریع بدون نیاز به ورق زدن تقویم.",
      detail: openCalendarDetailTour },
    { get: function () { return bottomNavBtn("امروز"); },
      title: "صفحه‌ی «امروز» — کار روزانه",
      text: "هر روز به ۴ ربع ماتریس آیزنهاور تقسیم می‌شه: «مهم و ضروری»، «مهم، غیرضروری»، «ضروری، غیرمهم» و «نه مهم نه ضروری» (اسم و سهم درصدی هر ربع از تنظیمات قابل تغییره).\n\nمثال: فردا یه جلسه‌ی کاری مهم داری. بنویسش زیر «مهم و ضروری»؛ با دکمه‌ی ⏰ کنارش ساعت ۱۰:۰۰، مکان «دفتر»، توضیح «فایل ارائه رو ببر» و یادآوری ۳۰ دقیقه قبل رو تنظیم کن. با تیک زدن، کار انجام‌شده می‌شه. پایین صفحه هم یه باکس یادداشت روزانه برای هر چیزی که دلت خواست هست.",
      detail: openTodayDetailTour },
    { get: function () { return bottomNavBtn("اهداف"); },
      title: "اهداف — با مثال",
      text: "هدف بزرگ‌تره و معمولاً چند هفته تا چند ماه طول می‌کشه، برخلاف کار روزانه.\n\nمثال: هدف «یادگیری ۶۰۰ کلمه‌ی انگلیسی». وقتی می‌سازیش، یکی از ۴ ربع رو انتخاب می‌کنی، نیاز روزانه («۱۰ کلمه در روز») و نیاز ماهانه رو می‌نویسی، مقدار کل هدف (۶۰۰) رو وارد می‌کنی. بعد می‌تونی هدف فرعی («۱۰۰ کلمه‌ی اول») اضافه کنی و هر بار که پیشرفت کردی، عدد فعلی رو آپدیت کنی — نوار درصد خودکار پر می‌شه.",
      detail: openGoalsDetailTour },
    { get: function () { return bottomNavBtn("عادت‌ها"); },
      title: "عادت‌ها — دو مدل",
      text: "دو مدل ردیابی داره:\n\n• دایره‌ای: هر روز یکی از چند مرحله‌ی رنگی رو انتخاب می‌کنی. مثال: عادت «آب خوردن» با ۳ مرحله؛ 🟥 کم، 🟨 متوسط، 🟩 خوب.\n\n• عادت ساده: یه عدد وارد می‌کنی و رنگ خودش بر اساس بازه‌ای که تعریف کردی مشخص می‌شه. مثال: عادت «مطالعه» بر حسب دقیقه؛ ۰ تا ۱۵ قرمز، ۱۶ تا ۳۰ نارنجی، بیشتر از ۳۰ سبز.\n\nروی هر عادت که بزنی، تقویم ماهانه‌ش با رنگ‌های ثبت‌شده رو می‌بینی — خوب برای دیدن روندها.",
      detail: openHabitsDetailTour },
    { get: function () { return byId("dhw-fab"); },
      title: "سن و شمارش معکوس — با مثال",
      text: "تاریخ تولدت رو یه بار وارد می‌کنی؛ اپ سن دقیقت (روز، ساعت، حتی ثانیه) رو زنده نشون می‌ده.\n\nمثال: می‌تونی رویدادهای مهم آینده هم اضافه کنی، مثل «کنکور - ۱۵ اسفند» یا «تولد مامان» و شمارش معکوسش رو ببینی.",
      detail: openDhwDetailTour },
    { get: function () { return byId("skw-fab"); },
      title: "خودشناسی — با مثال",
      text: "یه دفترچه‌ی نوشتن آزاده، بدون محدودیت طول. دسته‌بندی‌های آماده داره (مثلاً «تغییرات»، «اشتباهات») و می‌تونی دسته‌ی دلخواه خودت رو هم بسازی.\n\nمثال: یه دسته‌ی جدید به اسم «چیزهایی که امروز یاد گرفتم» بساز و هر شب چند خط توش بنویس.",
      detail: openSkwDetailTour },
    { get: function () { return byId("sww-fab"); },
      title: "خواب و کار — با مثال",
      text: "ساعت خواب شب، بیدار شدن، چرت‌های وسط روز، و بازه‌های کاری/غیرکاری/هدررفت وقت رو ثبت می‌کنی.\n\nمثال: خواب از ۲۳:۰۰ تا ۰۷:۰۰، یه چرت ۲۰ دقیقه‌ای ظهر، و ۴ ساعت کار متمرکز صبح. این داده‌ها بعداً توی «بازنگری» به‌صورت خلاصه نشونت داده می‌شه.",
      detail: openSwwDetailTour },
    { get: function () { return byId("gtw-fab"); },
      title: "مدیریت کارها (GTD) — با مثال",
      text: "هر فکر یا کاری که یهو به ذهنت می‌رسه رو همینجا، بدون نگرانی از تاریخ، سریع بریز.\n\nمثال: «باتری ماشین رو چک کن» یا «به علی زنگ بزن». بعداً وقتی وقت داشتی برمی‌گردی، اولویت‌بندی می‌کنی و به یه روز مشخص منتقلش می‌کنی تا زیر یکی از ۴ ربع همون روز بیفته.",
      detail: openGtwDetailTour },
    { get: function () { return byId("rvw-fab"); },
      title: "بازنگری — با مثال",
      text: "دیدِ کلی از عملکردت: نمودار روند هفتگی/ماهانه/سالانه، نقشه‌ی حرارتی عادت‌ها (شبیه گیت‌هاب)، خلاصه‌ی خواب و کار، و پیشرفت اهداف.\n\nمثال: آخر هر هفته یه سر بزن ببین نسبت به هفته‌ی قبل بهتر شدی یا نه، و کدوم عادت رو کم‌رنگ‌تر انجام دادی.",
      detail: openRvwDetailTour },
    { get: function () { return byId("alw-fab"); },
      title: "فعالیت‌های دلخواه — با مثال",
      text: "کارهایی که مدام تکرار می‌شن رو یک‌بار می‌سازی و ذخیره می‌کنی، به‌جای اینکه هر بار از اول تایپشون کنی.\n\nمثال: «پختن قرمه‌سبزی» رو با طرز تهیه‌ش توی توضیحات، یک‌بار ذخیره کن. هفته‌ی بعد که دوباره خواستی بپزیش، فقط از این فهرست انتخابش کن و به روز مورد نظر (با اهمیت، ساعت و مکان دلخواه همون روز) اضافه‌ش کن. از همین بخش می‌تونی کارهای یک روز خاص رو هم بدون حذف از روز اصلی، به روز دیگه‌ای کپی کنی.",
      detail: openAlwDetailTour },
    { get: function () { return byId("prw-fab"); },
      title: "چاپ / خروجی روزانه — با مثال",
      text: "برای وقتی می‌خوای یه بازه‌ی زمانی از دفترچه‌ت رو روی کاغذ داشته باشی یا به یه فایل PDF قابل اشتراک‌گذاری تبدیل کنی.\n\nمثال: بازه‌ی «از اول تا آخر ماه گذشته» رو انتخاب کن، گزینه‌ی «شامل عکس‌ها» و «شامل کارها» رو فعال نگه دار، حالت رنگی یا سیاه‌وسفید رو انتخاب کن و «ساخت و آماده‌سازی برای چاپ» رو بزن؛ بعد از همون صفحه مستقیم چاپ کن یا با «ذخیره به‌عنوان PDF»ی مرورگر، فایلش رو بگیر.",
      detail: openPrwDetailTour },
    { get: function () { return byId("sdw-fab"); },
      title: "دستیار درس — با مثال",
      text: "پنج بخش داره: تایمر (پومودورو + تمرین‌های تنفسی)، برنامه (زمان‌بندی مطالعه‌ی روز/هفته/ماه)، یادآوری (مرور دوره‌ای دروس با فاصله‌ی زمانی افزایشی)، یادداشت (دسته‌بندی‌شده بر اساس درس) و پشتیبان (بکاپ جداگانه‌ی فقط همین بخش).\n\nمثال: قبل از شروع مطالعه‌ی شیمی، تایمر پومودورو رو روی ۲۵ دقیقه کار / ۵ دقیقه استراحت تنظیم کن. بعد از خوندن یه فصل، اون درس رو به «یادآوری» اضافه کن تا با فاصله‌ی زمانی افزایشی (مثلاً ۱، ۳، ۷، ۱۶، ۳۰ روز بعد) بهت یادآوری بشه دوباره مرورش کنی. نکته‌های مهم فصل رو هم زیر دسته‌ی «شیمی» توی یادداشت‌ها ذخیره کن.",
      detail: openSdwDetailTour },
    { get: function () { return byId("pjw-fab"); },
      title: "پروژه‌ها — با مثال",
      text: "برای کارهایی که فقط یه «کار روزانه» نیستن و چند هفته یا ماه، با چند مرحله، طول می‌کشن.\n\nمثال: پروژه‌ی «راه‌اندازی وب‌سایت شخصی» رو بساز؛ زیرش ریزکارهایی مثل «خرید دامنه»، «طراحی صفحه‌ی اصلی» و «نوشتن محتوا» رو اضافه کن، و یه نقطه‌ی عطف («انتشار نسخه‌ی اول») با یه تاریخ هدف تعیین کن. با تیک زدن هر ریزکار، نوار پیشرفت پروژه خودکار به‌روز می‌شه.",
      detail: openPjwDetailTour },
    { get: function () { return byId("adhd-fab"); },
      title: "حالت تمرکز / ADHD — با مثال",
      text: "وقتی روشنش می‌کنی، به‌جای دیدن کل لیست کارهای روز که ممکنه سردرگم‌ت کنه، فقط یه کار رو در لحظه بهت نشون می‌ده و بقیه رو کنار می‌ذاره، همراه با یه تایمر کار/استراحت.\n\nمثال: روزی که کارهات زیادن و نمی‌دونی از کجا شروع کنی، این حالت رو بزن؛ اپ اولین کار مهم روز رو تمام‌صفحه نشونت می‌ده با یه تایمر پومودورو کنارش. وقتی «تمومش کردم» رو بزنی، کار بعدی میاد. می‌تونی از تنظیمات همین حالت، ظاهر برنامه (چیدمان روزانه و آیکون‌ها) رو هم موقتاً ساده‌تر کنی تا حواس‌پرتی کمتر بشه — با خاموش کردنش، همه‌چیز به حالت قبل برمی‌گرده.",
      detail: openAdhdDetailTour },
    { get: function () { return byId("lang-fab"); },
      title: "زبان‌آموز — با مثال",
      text: "یه کارت‌واژه‌ساز با سیستم مرور فاصله‌دار (Spaced Repetition)؛ لغت رو یک‌بار وارد می‌کنی و اپ خودش یادت می‌ندازه کِی دوباره مرورش کنی.\n\nمثال: لغت انگلیسی «Resilience» رو با معنی فارسیش اضافه کن. اپ فردا (۱ روز بعد) ازت می‌پرسه یادته یا نه؛ اگه بلد بودی، فاصله‌ی مرور بعدی بیشتر می‌شه (۳ روز، ۷ روز، ۱۶ روز، ۳۰ روز...)، و اگه یادت رفته بود، دوباره از اول کوتاه می‌شه. جهت مرور (انگلیسی به فارسی، فارسی به انگلیسی، یا هر دو تصادفی) هم قابل تنظیمه.",
      detail: openLangDetailTour },
    { get: function () { return byId("fin-fab"); },
      title: "مدیریت مالی — با مثال",
      text: "دخل‌وخرج، پس‌انداز، بدهی، بودجه، دارایی‌ها و حتی اثر تورم روی پولت رو از یک‌جا مدیریت کن؛ شش تب بالای صفحه بین این بخش‌ها جابه‌جات می‌کنه.\n\nمثال: توی تب «هزینه‌ها» درآمد ماهانه‌ت رو وارد کن و هر خرجی (مثلاً «ناهار»، ۱۵۰ هزار تومان، دسته‌ی «خوراک») رو ثبت کن. توی تب «اهداف» یه هدف پس‌انداز مثل «خرید لپ‌تاپ» با مبلغ هدف بساز. توی تب «بدهی» اگه وامی داری، مونده‌ش رو پیگیری کن. توی «بودجه» برای هر دسته (خوراک، پوشاک...) سقف ماهانه تعیین کن تا هشدار بگیری وقتی بهش نزدیک می‌شی.",
      detail: openFinDetailTour },
    { get: function () { return byId("pnd-fab") || bottomNavBtn("ناتمام‌ها"); },
      title: "ناتمام‌ها — با مثال",
      text: "کارهایی که توی روزهای قبل ثبت کردی ولی تیک نزدی (تمومشون نکردی)، خودکار میان توی همین بخش، دسته‌بندی‌شده بر اساس روز؛ اینجوری هیچ کاری بی‌سروصدا گم نمی‌شه.\n\nمثال: دیروز نوشته بودی «زنگ زدن به بانک» ولی انجامش ندادی؛ امروز همینجا می‌بینیش. می‌تونی تیکش بزنی (تمومش کنی)، حذفش کنی (با یا بدون تاییدیه، بسته به تنظیمات)، یا با دکمه‌ی جابه‌جایی، به یه روز دیگه (شمسی یا میلادی) و یه ربع جدید از ماتریس آیزنهاور منتقلش کنی. از تنظیمات می‌تونی انتخاب کنی این بخش پایین صفحه بمونه یا یه دکمه‌ی شناور بالای صفحه، کنار بازنگری، داشته باشه.",
      detail: openPendingDetailTour },
    { get: function () { return settingsGearBtn(); },
      title: "تنظیمات — با مثال",
      text: "سهم هر ربع از کارهای روزانه رو با عدد مشخص می‌کنی (باید جمعاً ۱۰۰٪ بشه) — مثلاً ۶۰٪ برای «مهم و ضروری» و ۲۲٪ برای «ضروری، غیرمهم». اگه نمی‌خوای عدد یه ربع با تغییر بقیه جابه‌جا بشه، دکمه‌ی «قفل» کنارش رو بزن.\n\nپشتیبان‌گیری ابری و دانلود/بازیابیِ فایل پشتیبان (کامل یا فقط یه بازه‌ی زمانی مشخص) هم از همینجاست؛ می‌تونی یه پشتیبان خودکار روزانه هم به یه پوشه‌ی دلخواه تنظیم کنی تا خودش هر روز سر یه ساعت مشخص ذخیره کنه. توصیه می‌شه هر چند وقت یه‌بار پشتیبان بگیری. از بخش «دسترسی‌ها» می‌تونی دسترسی میکروفون، دوربین و گالری رو زودتر تست کنی. سبک آیکون‌های شناور بالای صفحه رو رنگی یا خطی انتخاب کن، و از «تم و ظاهر» حالت روز/شب (شب، روز، کرم، آبی نیمه‌شب یا رنگ کاملاً دلخواه) و رنگ اصلی برنامه رو تنظیم و در صورت خواست به‌عنوان تم ذخیره کن.\n\nاز «سبک نمایش کارهای روزانه» انتخاب کن صفحه‌ی هر روز به‌صورت دسته‌بندی‌شده (ماتریس آیزنهاور)، لیست ساده، یا یه چیدمان کاملاً دلخواهِ خودت نمایش داده بشه. از «تنظیمات عمومی» مشخص کن قبل از حذف کار ناتمام ازت تاییدیه گرفته بشه یا نه، و از «محل دسترسی به ناتمام‌ها» انتخاب کن اون بخش پایین صفحه بمونه یا یه دکمه‌ی شناور بالا، کنار بازنگری.",
      note: "توضیحات کامل‌تر همین‌جا، توی خود تنظیماته؛ اگه خواستی آموزش بخش‌به‌بخش هر قسمت اپ رو ببینی، از همین‌جا برو توی تنظیمات و «راهنمای کامل» رو بزن.",
      detail: openSettingsDetailTour }
  ];

  function firstGoalEl(sel) {
    var list = document.querySelectorAll(sel);
    return list.length ? list[0] : null;
  }
  function clickIfExists(el) { if (el) el.click(); }
  function ensureAddFormOpen() {
    var addBtn = byId("goal-new-toggle-btn");
    if (addBtn && !byId("goal-title-input")) addBtn.click();
  }
  function ensureFirstGoalExpanded() {
    var card = firstGoalEl('[data-tour="goal-card"]');
    if (!card) return;
    var hasInnerToggle = card.querySelector('[data-tour="subgoal-toggle"]');
    if (!hasInnerToggle) {
      var row = card.querySelector('[data-tour="goal-expand-row"]');
      clickIfExists(row);
    }
  }
  function ensureSubgoalsEnabled() {
    var cb = firstGoalEl('[data-tour="subgoal-toggle"] input');
    if (cb && !cb.checked) cb.click();
  }
  function ensureProgressEnabled() {
    var cb = firstGoalEl('[data-tour="progress-toggle"] input');
    if (cb && !cb.checked) cb.click();
  }
  function ensureRoutineFormOpen() {
    var already = document.querySelector('[data-tour="routine-form"]');
    if (already) return;
    var btn = firstGoalEl('[data-tour="routine-link-btn"]');
    if (btn) btn.click();
  }

  var goalsDetailSteps = [
    { get: function () { return byId("goal-new-toggle-btn"); },
      before: ensureAddFormOpen,
      title: "۱) دکمه‌ی «+ هدف جدید»",
      text: "برای ساختن هر هدف تازه، اول روی همین دکمه بزن تا فرم ساخت هدف زیرش باز بشه." },
    { get: function () { return byId("goal-title-input"); },
      before: ensureAddFormOpen,
      title: "۲) عنوان هدف",
      text: "اسم هدف رو اینجا می‌نویسی؛ مثلاً «درس خواندن» یا «یادگیری ۶۰۰ کلمه‌ی انگلیسی»." },
    { get: function () { return document.querySelector('[data-tour="goal-quadrant-row"]'); },
      before: ensureAddFormOpen,
      title: "۳) اهمیت هدف (ماتریس آیزنهاور)",
      text: "یکی از این ۴ حالت رو انتخاب می‌کنی: «مهم و ضروری»، «مهم، غیرضروری»، «ضروری، غیرمهم» یا «غیرمهم و غیرضروری». این همون تقسیم‌بندی معروف ماتریس آیزنهاور (Eisenhower) برای اولویت‌بندیه. مثال: هدف «درس خواندن» رو معمولاً «مهم و ضروری» انتخاب می‌کنی." },
    { get: function () { return byId("goal-daily-input"); },
      before: ensureAddFormOpen,
      title: "۴) نیاز روزانه (اختیاری)",
      text: "اینجا می‌نویسی هر روز چقدر باید پیش بری؛ مثلاً «۱۰ کلمه در روز». فقط برای یادآوریِ خودته و توی پیشرفت درصدی حساب نمی‌شه." },
    { get: function () { return byId("goal-monthly-input"); },
      before: ensureAddFormOpen,
      title: "۵) نیاز ماهانه (اختیاری)",
      text: "همین‌طور می‌تونی نیاز ماهانه‌ت رو هم بنویسی؛ مثلاً «۳۰۰ کلمه در ماه». این هم فقط یادآوریه." },
    { get: function () { return byId("goal-target-input"); },
      before: ensureAddFormOpen,
      title: "۶) مقدار کل نیاز (اختیاری)",
      text: "مقدار کل هدف رو اینجا وارد می‌کنی؛ مثلاً ۱ (صفحه) یا ۶۰۰ (کلمه). با پر کردن این عدد، بعداً یه نوار درصد پیشرفت خودکار براش ساخته می‌شه." },
    { get: function () { return byId("goal-save-btn"); },
      before: ensureAddFormOpen,
      title: "۷) دکمه‌ی «ذخیره هدف»",
      text: "با زدن این دکمه هدف ساخته و توی لیست اضافه می‌شه و فرم بسته می‌شه." },
    { get: function () { return document.querySelector('[data-tour="subgoal-toggle"]'); },
      before: ensureFirstGoalExpanded,
      title: "۸) تیک «امکان هدف فرعی»",
      text: "بعد از ساختن هدف، روی خودِ هدف بزن تا باز بشه. این تیک رو که بزنی، می‌تونی هدف رو به چند هدف فرعیِ کوچیک‌تر بشکنی؛ مثلاً زیر هدف «درس خواندن»، یه هدف فرعی به اسم «انگلیسی» بسازی." },
    { get: function () { return document.querySelector('[data-tour="progress-toggle"]'); },
      before: ensureFirstGoalExpanded,
      title: "۹) تیک «پیشرفت عددی کلی»",
      text: "این تیک، یه نوار پیشرفت کلی برای خودِ هدف (نه هدف‌های فرعی) فعال می‌کنه؛ هر بار عدد فعلی رو آپدیت کنی، درصدش خودکار محاسبه می‌شه." },
    { get: function () { return document.querySelector('[data-tour="goal-progress-block"]'); },
      before: function () { ensureFirstGoalExpanded(); ensureProgressEnabled(); },
      title: "۱۰) پیشرفت کلی هدف",
      text: "وقتی «پیشرفت عددی کلی» رو روشن کنی، این باکس ظاهر می‌شه: یه عدد «انجام‌شده» و یه عدد «نیاز کل». مثلاً اگه نیاز کل رو ۶۰۰ گذاشتی، هر بار که پیش رفتی عدد انجام‌شده رو آپدیت کن (مثلاً ۱۵۰)، نوار درصد خودش پر می‌شه." },
    { get: function () { return document.querySelector('[data-tour="subgoal-add-input"]'); },
      before: function () { ensureFirstGoalExpanded(); ensureSubgoalsEnabled(); },
      title: "۱۱) افزودن هدف فرعی",
      text: "وقتی «امکان هدف فرعی» روشنه، از این باکس هدف‌های فرعی می‌سازی؛ مثلاً «انگلیسی» رو بنویس و اینتر بزن یا روی + بزن. هر هدف فرعی برای خودش نوار پیشرفت و «نیاز کل» جدا داره." },
    { get: function () { return document.querySelector('[data-tour="routine-link-btn"]'); },
      before: function () { ensureFirstGoalExpanded(); ensureSubgoalsEnabled(); },
      title: "۱۲) روتین زمان‌دار (رنگ‌بندی دستی)",
      text: "زیر هر هدف فرعی این لینک هست. باهاش می‌تونی به‌جای نوار پیشرفت ساده، یه ردیاب رنگیِ روزانه (مثل عادت‌ها) براش بسازی — برای وقتی که می‌خوای هر روز رو جدا رنگ‌بندی کنی، نه فقط یه درصد کلی." },
    { get: function () { return document.querySelector('[data-tour="routine-form"]'); },
      before: function () { ensureFirstGoalExpanded(); ensureSubgoalsEnabled(); ensureRoutineFormOpen(); },
      title: "۱۳) فرم روتین رنگی",
      text: "«مقدار کل» و «تعداد روز» اختیاری‌ان. بعد مشخص می‌کنی هر بازه‌ی مقدار چه رنگی بشه — مثلاً ۳۰ کلمه یا بیشتر = سبز، ۲۰ کلمه یا بیشتر = آبی. رنگ و حداقل مقدار و برچسب رو وارد کن، با + اضافه‌ش کن، در آخر «ثبت روتین» رو بزن. از اون به بعد، این هدف فرعی مثل یه عادت روزانه با تقویم رنگی ردیابی می‌شه." },
    { get: function () { return document.querySelector('[data-tour="subsubgoal-add-input"]'); },
      before: function () { ensureFirstGoalExpanded(); ensureSubgoalsEnabled(); },
      title: "۱۴) ریز هدف",
      text: "اگه یه هدف فرعی داری، می‌تونی زیر خودش هم چند «ریز هدف» کوچیک‌تر (فقط تیک، بدون درصد) اضافه کنی — برای کارهای خیلی جزئی که فقط باید انجام بشن." },
    { get: function () { return document.querySelector('[data-tour="delete-goal-btn"]'); },
      before: ensureFirstGoalExpanded,
      title: "۱۵) حذف این هدف",
      text: "اگه دیگه به هدف نیاز نداری، از همینجا کامل حذفش می‌کنی — یه تاییدیه هم قبلش ازت می‌گیره." }
  ];

  function openGoalsDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    var navBtn = bottomNavBtn("اهداف");
    setTimeout(function () {
      clickIfExists(navBtn);
      setTimeout(function () {
        activeSteps = goalsDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureQuadExpandOpen() {
    var panel = document.querySelector('[data-tour="quad-task-expand-panel"]');
    if (panel) return;
    var btn = document.querySelector('[data-tour="quad-task-expand-btn"]');
    if (btn) btn.click();
  }

  var todayDetailSteps = [
    { get: function () { return document.querySelector('[data-tour="today-progress-card"]'); },
      title: "۱) پیشرفت امروز",
      text: "بالای صفحه، درصد پیشرفت امروز و تعداد کارهای انجام‌شده رو نشون می‌ده." },
    { get: function () { return document.querySelector('[data-tour="quad-card"]'); },
      title: "۲) ربع‌های ماتریس آیزنهاور",
      text: "هر روز به ۴ ربع تقسیم می‌شه؛ این اولین ربع یعنی «مهم و ضروری» رو می‌بینی. کارهای هر ربع زیر خودش لیست می‌شه." },
    { get: function () { return document.querySelector('[data-tour="quad-task-input"]'); },
      title: "۳) نوشتن کار جدید",
      text: "اسم کاری که می‌خوای انجام بدی رو همینجا بنویس و اینتر بزن یا از دکمه‌ی + استفاده کن." },
    { get: function () { return document.querySelector('[data-tour="quad-task-add-btn"]'); },
      title: "۴) دکمه‌ی افزودن",
      text: "با زدن این دکمه، کار به لیست همون ربع اضافه می‌شه." },
    { get: function () { return document.querySelector('[data-tour="quad-task-expand-btn"]'); },
      title: "۵) زمان و مکان (اختیاری)",
      text: "با زدن این دکمه می‌تونی برای کار، ساعت، مکان، توضیحات و یادآوری هم تنظیم کنی." },
    { get: function () { return document.querySelector('[data-tour="quad-task-expand-panel"]'); },
      before: ensureQuadExpandOpen,
      title: "۶) جزئیات کار",
      text: "اینجا ساعت و مکان و یه توضیح کوتاه رو وارد کن، و نوع یادآوری (نوتیفیکیشن یا ایمیل) رو هم انتخاب کن." },
    { get: function () { return document.querySelector('[data-tour="daily-journal-textarea"]'); },
      title: "۷) یادداشت روزانه",
      text: "پایین صفحه هم یه باکس یادداشت روزانه هست؛ هر چیزی که دلت خواست بنویس، خودکار ذخیره می‌شه." }
  ];

  function openTodayDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    var navBtn = bottomNavBtn("امروز");
    setTimeout(function () {
      clickIfExists(navBtn);
      setTimeout(function () {
        activeSteps = todayDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureHabitFormOpen() {
    var btn = byId("habit-new-toggle-btn");
    if (btn && !byId("habit-name-input")) btn.click();
  }

  var habitsDetailSteps = [
    { get: function () { return byId("habit-new-toggle-btn"); },
      before: ensureHabitFormOpen,
      title: "۱) دکمه‌ی «عادت جدید»",
      text: "برای ساختن عادت تازه، اول روی این دکمه بزن تا فرمش باز بشه." },
    { get: function () { return byId("habit-name-input"); },
      before: ensureHabitFormOpen,
      title: "۲) اسم عادت",
      text: "اسم عادت رو اینجا بنویس؛ مثلاً «آب خوردن» یا «مطالعه»." },
    { get: function () { return byId("habit-desc-input"); },
      before: ensureHabitFormOpen,
      title: "۳) توضیح (اختیاری)",
      text: "اگه لازم بود، یه توضیح کوتاه هم براش بنویس." },
    { get: function () { return document.querySelector('[data-tour="habit-type-row"]'); },
      before: ensureHabitFormOpen,
      title: "۴) نوع ردیابی",
      text: "سه مدل داری: «دایره‌ای» (چند مرحله‌ی رنگی مثل کم/متوسط/خوب)، «عادت ساده» (یه عدد وارد می‌کنی و رنگش بر اساس بازه مشخص می‌شه)، یا «ترکیبی»." },
    { get: function () { return byId("habit-tier-label-input"); },
      before: ensureHabitFormOpen,
      title: "۵) افزودن مرحله یا بازه",
      text: "برای مدل دایره‌ای یا عادت ساده، رنگ و برچسب هر مرحله رو اینجا اضافه کن؛ مثلاً ۰ تا ۱۵ دقیقه قرمز، بیشتر از ۳۰ دقیقه سبز." },
    { get: function () { return byId("habit-save-btn"); },
      before: ensureHabitFormOpen,
      title: "۶) ذخیره عادت",
      text: "با زدن این دکمه، عادت ساخته می‌شه و به لیست اضافه می‌شه." },
    { get: function () { return document.querySelector('[data-tour="habit-list-item"]'); },
      title: "۷) ثبت روزانه",
      text: "روی هر عادت که بزنی، تقویم ماهانه‌ش با رنگ‌های ثبت‌شده باز می‌شه — همینجا هر روز وضعیتت رو ثبت کن." }
  ];

  function openHabitsDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    var navBtn = bottomNavBtn("عادت‌ها");
    setTimeout(function () {
      clickIfExists(navBtn);
      setTimeout(function () {
        activeSteps = habitsDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  var boxesHabitDetailSteps = [
    { get: function () { return document.querySelector('[data-tour="habit-type-row"]'); },
      title: "۱) نوع «برنامه (باکسی)»",
      text: "این نوع برای عادتی مناسبه که هر روز هفته شکلش فرق می‌کنه — مثل برنامه‌ی باشگاه. مطمئن شو گزینه‌ی «برنامه (باکسی)» انتخابه." },
    { get: function () { return byId("habit-name-input"); },
      title: "۲) اسم عادت",
      text: "اسم کلی این برنامه رو بنویس؛ مثلاً «باشگاه» یا «برنامه‌ی تمرین هفتگی»." },
    { get: function () { return document.querySelector('[data-tour="box-name-input"]'); },
      title: "۳) اسم باکس",
      text: "هر باکس یعنی یک بخش از برنامه‌ت. اسمش رو بنویس؛ مثلاً «روز اول: سینه و سرشانه» یا «گرم کردن»." },
    { get: function () { return document.querySelector('[data-tour="box-color-row"]'); },
      title: "۴) رنگ این باکس",
      text: "یه رنگ برای این باکس انتخاب کن (یا بدون رنگ بذارش)؛ این رنگ توی نمودار پیشرفت ماهانه استفاده می‌شه." },
    { get: function () { return document.querySelector('[data-tour="box-ex-name-input"]'); },
      title: "۵) نام حرکت",
      text: "حرکت‌های داخل این باکس رو یکی‌یکی اضافه کن؛ مثلاً «پرس سینه هالتر»." },
    { get: function () { return document.querySelector('[data-tour="box-ex-detail-input"]'); },
      title: "۶) جزئیات حرکت (اختیاری)",
      text: "برای هر حرکت می‌تونی جزئیات هم بنویسی؛ مثلاً «۳ ست ۱۲ تایی»." },
    { get: function () { return document.querySelector('[data-tour="box-ex-add-btn"]'); },
      title: "۷) افزودن حرکت",
      text: "با زدن این دکمه، حرکت به لیست حرکت‌های این باکس اضافه می‌شه. برای هر حرکت دیگه این کار رو تکرار کن." },
    { get: function () { return document.querySelector('[data-tour="box-weekday-row"]'); },
      title: "۸) روزهای هفته‌ی این باکس",
      text: "مشخص کن این باکس کدوم روزهای هفته انجام بشه؛ مثلاً فقط شنبه و سه‌شنبه." },
    { get: function () { return document.querySelector('[data-tour="box-add-btn"]'); },
      title: "۹) افزودن این باکس",
      text: "با زدن این دکمه، باکس ساخته می‌شه و به لیست باکس‌های این برنامه اضافه می‌شه." },
    { get: function () { return document.querySelector('[data-tour="box-list"]'); },
      title: "۱۰) لیست باکس‌های ساخته‌شده",
      text: "باکس‌هایی که ساختی اینجا لیست می‌شن؛ با دکمه‌های ▲▼ ترتیب نمایششون توی همون روز رو عوض کن. برای باکس‌های بعدی، همین مراحل رو از بالا تکرار کن." },
    { get: function () { return byId("habit-save-btn"); },
      title: "۱۱) ذخیره عادت",
      text: "وقتی همه‌ی باکس‌هات رو ساختی، این دکمه رو بزن تا کل برنامه ذخیره بشه." }
  ];

  function openBoxesHabitDetailTour() {
    closeTour();
    activeSteps = boxesHabitDetailSteps;
    showStep(0);
  }
  window.bjStartBoxesGuideTour = openBoxesHabitDetailTour;

  var calendarDetailSteps = [
    { get: function () { return document.querySelector('[data-tour="cal-day-grid"]'); },
      title: "۱) تقویم ماهانه",
      text: "روزهایی که توشون کار، عادت یا یادداشت ثبت کردی، یه نقطه‌ی رنگی کوچیک زیرشون می‌بینی. روی هر روز که بزنی، وارد همون روز می‌شی و کارها/عادت‌ها/یادداشتش رو می‌بینی یا ویرایش می‌کنی." },
    { get: function () { return document.querySelector('[data-tour="cal-month-nav"]'); },
      title: "۲) جابه‌جایی بین ماه‌ها",
      text: "با فلش‌های کنار اسم ماه (مثلاً «مهر ۱۴۰۴») بین ماه‌های قبل و بعد جلو و عقب برو." },
    { get: function () { return document.querySelector('[data-tour="cal-today-btn"]'); },
      title: "۳) رفتن به امروز",
      text: "هر جای تقویم که باشی، با زدن این دکمه سریع برمی‌گردی به روز جاری." },
    { get: function () { return document.querySelector('[data-tour="cal-upcoming-list"]'); },
      title: "۴) کارهای زمان‌دار پیش رو",
      text: "پایین تقویم، یه لیست کوتاه از کارهای زمان‌دارِ «این هفته» و «ماه پیش رو» می‌بینی — برای مرور سریع بدون نیاز به ورق زدن تقویم. روی هر روز از این لیست بزنی، مستقیم واردش می‌شی." }
  ];

  function openCalendarDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    var navBtn = bottomNavBtn("تقویم");
    setTimeout(function () {
      clickIfExists(navBtn);
      setTimeout(function () {
        activeSteps = calendarDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensurePendingMoveOpen() {
    var panel = document.querySelector('[data-tour="pnd-move-panel"]');
    if (panel) return;
    var btn = document.querySelector('[data-tour="pnd-move-btn"]');
    if (btn) btn.click();
  }

  var pendingDetailSteps = [
    { get: function () { return document.querySelector('[data-tour="pnd-header"]'); },
      title: "۱) کارهای ناتمام قبلی",
      text: "کارهایی که توی روزهای قبل نوشتی ولی تیک نزدی، خودکار میان همینجا؛ تعداد کلشون هم بالای لیست نشون داده می‌شه.\n\n(برای این آموزش یه کار نمونه موقت ساختیم؛ در پایان تور خودکار پاک می‌شه.)" },
    { get: function () { return document.querySelector('[data-tour="pnd-group-card"]'); },
      title: "۲) گروه‌بندی بر اساس روز",
      text: "کارها زیر تاریخ همون روزی که ثبت شدن دسته‌بندی می‌شن. روی تاریخ بزن تا مستقیم بری توی همون روز." },
    { get: function () { return document.querySelector('[data-tour="pnd-task-row"]'); },
      title: "۳) تیک زدن، جابه‌جایی یا حذف",
      text: "کنار هر کار سه تا دکمه هست: تیک برای تمومش کردن، آیکون جابه‌جایی برای انتقال به روز دیگه، و سطل زباله برای حذف." },
    { get: function () { return document.querySelector('[data-tour="pnd-move-panel"]'); },
      before: ensurePendingMoveOpen,
      title: "۴) انتقال به روز و ربع دیگه",
      text: "تاریخ مقصد رو شمسی یا میلادی انتخاب کن و مشخص کن زیر کدوم ربع از ماتریس آیزنهاور بره؛ بعد «انتقال بده» رو بزن." },
    { get: function () { return document.querySelector('[data-tour="pnd-delete-btn"]'); },
      title: "۵) حذف کار ناتمام",
      text: "با زدن سطل زباله، کار حذف می‌شه. اگه از تنظیمات فعالش کرده باشی، قبل از حذف ازت تاییدیه می‌گیره تا اشتباهی چیزی پاک نشه." }
  ];

  function openPendingDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    if (window.bjPndDemo) window.bjPndDemo.ensure();
    pndDemoActive = true;
    var navBtn = function () { return byId("pnd-fab") || bottomNavBtn("ناتمام‌ها"); };
    setTimeout(function () {
      clickIfExists(navBtn());
      setTimeout(function () {
        activeSteps = pendingDetailSteps;
        showStep(0);
      }, 300);
    }, 200);
  }

  var dhwDetailSteps = [
    { get: function () { return byId("dhw-fab"); },
      title: "۱) آیکون سن و شمارش معکوس",
      text: "این آیکون 🎂 پنل سن و شمارش معکوس رو باز می‌کنه." },
    { get: function () { return byId("dhw-birth-picker"); },
      title: "۲) تاریخ تولد",
      text: "تاریخ تولدت رو وارد کن؛ می‌تونی حالت میلادی یا شمسی رو از این دکمه‌ها انتخاب کنی." },
    { get: function () { return byId("dhw-save-birth"); },
      title: "۳) ذخیره‌ی تاریخ تولد",
      text: "با زدن این دکمه، سن دقیقت (سال، ماه، روز) محاسبه و رویداد «تولد بعدی» هم به لیست اضافه می‌شه." },
    { get: function () { return byId("dhw-edit-birth"); },
      title: "۴) ویرایش تاریخ تولد",
      text: "اگه بعداً بخوای تاریخ تولد رو عوض کنی، از همینجا ویرایشش کن." },
    { get: function () { return document.querySelector(".dhw-row"); },
      title: "۵) رویدادهای پیش‌فرض",
      text: "این ردیف‌ها رویدادهای پیش‌فرض هستن (تولد بعدی، نوروز، سال نوی میلادی) و شمارش معکوس روزهاشون رو نشون می‌دن." },
    { get: function () { return byId("dhw-ev-name"); },
      title: "۶) اسم رویداد دلخواه",
      text: "برای اضافه کردن یه رویداد دلخواه (مثل سالگرد ازدواج یا کنکور)، اول اسمش رو اینجا بنویس." },
    { get: function () { return byId("dhw-ev-datepicker"); },
      title: "۷) تاریخ رویداد",
      text: "تاریخ رویداد رو انتخاب کن؛ میلادی یا شمسی، هرکدوم راحت‌تری." },
    { get: function () { return byId("dhw-ev-recur"); },
      title: "۸) تکرار سالانه",
      text: "اگه این رویداد هر سال تکرار می‌شه (مثل تولد یا سالگرد)، این تیک رو بزن." },
    { get: function () { return byId("dhw-add-event"); },
      title: "۹) افزودن رویداد",
      text: "با زدن این دکمه، رویداد به لیست بالا اضافه می‌شه و شمارش معکوسش رو می‌بینی." }
  ];

  function openDhwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("dhw-fab"));
      setTimeout(function () {
        activeSteps = dhwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function skwEnsureCatOpen() {
    var page = byId("skw-cat-page");
    if (page && page.style.display === "flex") return;
    var cat = document.querySelector('.skw-cat[data-cat="know"]');
    if (cat) cat.click();
  }
  function skwEnsureSectionOpen() {
    skwEnsureCatOpen();
    var epage = byId("skw-editor-page");
    if (epage && epage.style.display === "flex") return;
    var row = document.querySelector(".skw-section-row");
    if (row) row.click();
  }

  var skwDetailSteps = [
    { get: function () { return byId("skw-fab"); },
      title: "۱) آیکون خودشناسی",
      text: "این آیکون 📖 دفترچه‌ی خودشناسی رو باز می‌کنه." },
    { get: function () { return document.querySelector('.skw-cat[data-cat="know"]'); },
      title: "۲) دسته‌های آماده",
      text: "سه دسته‌ی آماده داری: «خودشناسی»، «تغییراتی که می‌خوام انجام بدم» و «اشتباهاتی که دوست ندارم دیگه تکرار کنم». روی هرکدوم بزن تا بازش کنی." },
    { get: function () { return byId("skw-add-cat"); },
      title: "۳) افزودن دسته‌ی دلخواه",
      text: "اگه دسته‌ی دیگه‌ای هم لازم داری، از اینجا دسته‌ی دلخواه خودت رو بساز." },
    { get: function () { return document.querySelector(".skw-section-row"); },
      before: skwEnsureCatOpen,
      title: "۴) بخش‌های هر دسته",
      text: "هر دسته چند بخش آماده داره (مثلاً زیر «خودشناسی»: باورها و ارزش‌ها، نقاط قوت و ضعف). روی هرکدوم بزن تا بنویسی." },
    { get: function () { return document.querySelector(".skw-add-section-btn"); },
      before: skwEnsureCatOpen,
      title: "۵) افزودن بخش جدید",
      text: "برای اضافه کردن بخش جدید زیر همین دسته از این دکمه استفاده کن." },
    { get: function () { return byId("skw-editor-textarea"); },
      before: skwEnsureSectionOpen,
      title: "۶) نوشتن آزاد",
      text: "اینجا آزادانه بنویس؛ بدون محدودیت طول، و خودش ذخیره می‌شه." },
    { get: function () { return byId("skw-editor-back"); },
      before: skwEnsureSectionOpen,
      title: "۷) بازگشت",
      text: "با این دکمه برمی‌گردی به لیست بخش‌های همون دسته." }
  ];

  function openSkwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("skw-fab"));
      setTimeout(function () {
        activeSteps = skwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  var swwDetailSteps = [
    { get: function () { return byId("sww-fab"); },
      title: "۱) آیکون خواب و کار",
      text: "این آیکون پنل خواب و کار رو باز می‌کنه." },
    { get: function () { return document.querySelector(".sww-jdate-picker"); },
      title: "۲) انتخاب روز",
      text: "می‌تونی روز رو با فلش‌های کنارش عوض کنی یا مستقیم روز، ماه و سال شمسی رو از این‌جا انتخاب کنی." },
    { get: function () { return byId("sww-bed"); },
      title: "۳) ساعت خواب شب",
      text: "ساعت خواب رفتن و بیدار شدنت رو اینجا وارد کن (این فیلد و فیلد بیداری کنار هم هستن)." },
    { get: function () { return byId("sww-nap-add"); },
      title: "۴) چرت‌های وسط روز",
      text: "ساعت شروع و پایان چرت رو وارد کن و با این دکمه اضافه‌ش کن." },
    { get: function () { return byId("sww-block-add"); },
      title: "۵) بازه‌های روز",
      text: "بازه‌های روزت رو مشخص کن: کار کردم، کار نکردم یا هدررفت وقت؛ و با این دکمه اضافه‌ش کن." },
    { get: function () { return byId("sww-daysummary"); },
      title: "۶) خلاصه‌ی روز",
      text: "پایین صفحه خلاصه‌ی کل روز رو می‌بینی: مجموع خواب، کار، کار نکردن و هدررفت وقت." }
  ];

  function openSwwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("sww-fab"));
      setTimeout(function () {
        activeSteps = swwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function gtwEnsureInboxItem() {
    var item = document.querySelector(".gtw-inbox-item");
    if (item) return;
    var input = byId("gtw-new-input"), add = byId("gtw-new-add");
    if (input && add) { input.value = "مثال: تماس با بانک"; add.click(); }
  }
  function gtwEnsureQuadSelected() {
    gtwEnsureInboxItem();
    var row = document.querySelector(".gtw-transfer-row.gtw-show");
    if (row) return;
    var btn = document.querySelector(".gtw-quad-btn");
    if (btn) btn.click();
  }
  function gtwEnsureSchedTab() {
    var tab = byId("gtw-tab-sched");
    if (tab && !tab.className.match(/gtw-active/)) tab.click();
  }

  var gtwDetailSteps = [
    { get: function () { return byId("gtw-fab"); },
      title: "۱) آیکون مدیریت کارها",
      text: "این آیکون پنل مدیریت کارها (GTD) رو باز می‌کنه." },
    { get: function () { return byId("gtw-new-input"); },
      title: "۲) نوشتن کار بدون تاریخ",
      text: "هر فکری که به ذهنت می‌رسه رو همینجا بدون نگرانی از تاریخ بنویس و با دکمه‌ی «افزودن» ثبتش کن." },
    { get: function () { return document.querySelector(".gtw-quad-btn"); },
      before: gtwEnsureInboxItem,
      title: "۳) انتخاب ربع",
      text: "بعد از نوشتن کار، یکی از ۴ ربع ماتریس آیزنهاور رو براش انتخاب کن." },
    { get: function () { return document.querySelector(".gtw-transfer-row.gtw-show"); },
      before: gtwEnsureQuadSelected,
      title: "۴) انتقال به روز",
      text: "با انتخاب ربع، این بخش باز می‌شه: تاریخ رو انتخاب کن و «انتقال به روز» رو بزن تا کار زیر همون ربع، همون روز نمایش داده بشه." },
    { get: function () { return byId("gtw-tab-sched"); },
      title: "۵) تب «برنامه روزها»",
      text: "برای دیدن کارهایی که به روزهای مختلف منتقل کردی، این تب رو بزن." },
    { get: function () { return byId("gtw-sched-date"); },
      before: gtwEnsureSchedTab,
      title: "۶) انتخاب تاریخ",
      text: "تاریخ روز مورد نظر رو انتخاب کن تا کارهای همون روز رو ببینی، دسته‌بندی‌شده زیر هر ربع." }
  ];

  function openGtwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("gtw-fab"));
      setTimeout(function () {
        activeSteps = gtwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  var rvwDetailSteps = [
    { get: function () { return byId("rvw-fab"); },
      title: "۱) آیکون بازنگری",
      text: "این آیکون پنل بازنگری و آمار رو باز می‌کنه." },
    { get: function () { return byId("rvw-tab-week"); },
      title: "۲) بازه‌ی زمانی",
      text: "می‌تونی آمار رو هفتگی، ماهانه یا سالانه ببینی." },
    { get: function () { return byId("rvw-cards"); },
      title: "۳) کارت‌های خلاصه",
      text: "این کارت‌ها خلاصه‌ی عملکردت رو نشون می‌دن؛ مثلاً درصد کارهای انجام‌شده." },
    { get: function () { return byId("rvw-block-trend"); },
      title: "۴) نمودار روند",
      text: "روند عملکردت در طول بازه‌ی انتخابی رو اینجا می‌بینی." },
    { get: function () { return byId("rvw-block-heatmap"); },
      title: "۵) نقشه‌ی حرارتی",
      text: "یه عادت خاص رو از این منو انتخاب کن و نقشه‌ی حرارتی‌ش رو در طول سال ببین، شبیه گیت‌هاب." },
    { get: function () { return byId("rvw-block-habits"); },
      title: "۶) خلاصه‌ی عادت‌ها",
      text: "خلاصه‌ی همه‌ی عادت‌هات در این بازه‌ی زمانی." },
    { get: function () { return byId("rvw-block-journal"); },
      title: "۷) یادداشت‌های روزانه",
      text: "یادداشت‌های روزانه‌ای که نوشتی، اینجا جمع می‌شن." },
    { get: function () { return byId("rvw-block-sleep"); },
      title: "۸) خلاصه‌ی خواب و کار",
      text: "خلاصه‌ی خواب و ساعات کاری این بازه رو اینجا می‌بینی." },
    { get: function () { return byId("rvw-goals"); },
      title: "۹) پیشرفت اهداف",
      text: "پیشرفت اهدافت رو هم همینجا مرور کن." }
  ];

  function openRvwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("rvw-fab"));
      setTimeout(function () {
        activeSteps = rvwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  var settingsDetailSteps = [
    { get: function () { return settingsGearBtn(); },
      title: "۱) دکمه‌ی تنظیمات",
      text: "این آیکون پنل تنظیمات رو باز می‌کنه." },
    { get: function () { return byId("settings-icon-style-section"); },
      title: "۲) سبک آیکون‌های شناور",
      text: "نمایش دکمه‌های شناور بالای صفحه (سن، خودشناسی، خواب و کار، مدیریت کارها، بازنگری، فعالیت‌های دلخواه، و ناتمام‌ها اگه فعال باشه) رو رنگی یا خطی انتخاب کن." },
    { get: function () { return byId("settings-appearance-section"); },
      title: "۳) تم و ظاهر",
      text: "رنگ اصلی برنامه، حالت روز/شب و تم‌های ذخیره‌شده‌ت، همه از همین یک بخش قابل تنظیمه." },
    { get: function () { return byId("settings-cloud-backup-btn"); },
      title: "۴) پشتیبان‌گیری ابری",
      text: "با این دکمه می‌تونی از داده‌هات پشتیبان ابری بگیری." },
    { get: function () { return byId("settings-export-btn"); },
      title: "۵) دانلود پشتیبان (کامل)",
      text: "یه نسخه از کل داده‌هات رو به‌صورت فایل دانلود کن." },
    { get: function () { return byId("settings-range-backup-btn"); },
      title: "۶) پشتیبان بازه‌ای",
      text: "با زدن این دکمه یه فرم باز می‌شه که می‌تونی یه بازه‌ی تاریخ (شمسی یا میلادی، مثلاً «یک هفته‌ی خاص» یا «سه ماه پیش») انتخاب کنی. با زدن «دانلود پشتیبان این بازه»، فقط کارها، یادداشت روزانه و ثبت عادت‌های همون بازه (بدون عکس و صدا) توی یه فایل جدا دانلود می‌شه — برای وقتی که نمی‌خوای پشتیبان کامل و سنگین بگیری، فقط یه تکه‌ی مشخص." },
    { get: function () { return byId("settings-import-btn"); },
      title: "۷) بازیابی از فایل",
      text: "با انتخاب یه فایل پشتیبان قبلی، می‌تونی داده‌هات رو برگردونی." },
    { get: function () { return byId("settings-autobackup-section"); },
      title: "۸) پشتیبان‌گیری خودکار روزانه",
      text: "یه پوشه روی گوشی/کامپیوترت انتخاب کن و یه ساعت مشخص کن؛ هر روز سر همون ساعت (فقط وقتی برنامه توی مرورگر باز باشه) یه فایل پشتیبان تازه توی همون پوشه ذخیره می‌شه و فایل روز قبل خودکار حذف می‌شه، بدون اینکه خودت هر بار یادت باشه دستی پشتیبان بگیری. این پشتیبان خودکار شامل کارها، عادت‌ها، اهداف و یادداشت روزانه است (بدون عکس و صدا، برای سبک موندن). از همینجا می‌تونی همین الان هم یه پشتیبان بگیری یا آخرین پشتیبان رو به جای دیگه‌ای (مثلاً ایمیل یا درایو) اشتراک بذاری." },
    { get: function () { return byId("settings-permissions-section"); },
      title: "۹) دسترسی‌ها",
      text: "برای استفاده از یادداشت صوتی، افزودن عکس از گالری و دوربین، از اینجا می‌تونی دسترسی میکروفون، دوربین و گالری رو درخواست کنی." },
    { get: function () { return byId("settings-general-section"); },
      title: "۱۰) تنظیمات عمومی و محل دسترسی به «ناتمام‌ها»",
      text: "اینجا مشخص می‌کنی قبل از حذف یه کار ناتمام از بخش «ناتمام‌ها»، ازت تاییدیه گرفته بشه یا نه — برای جلوگیری از حذف تصادفی. پایین‌تر توی همین بخش هم انتخاب می‌کنی بخش کارهای ناتمام مثل پیش‌فرض پایین صفحه (کنار تب‌های دیگه) بمونه، یا یه دکمه‌ی شناور بالای صفحه، کنار آیکون بازنگری، براش بذاری." },
    { get: function () { return byId("settings-dayview-section"); },
      title: "۱۱) سبک نمایش کارهای روزانه",
      text: "نحوه‌ی نمایش کارهای هر روز رو انتخاب کن: دسته‌بندی‌شده بر اساس ماتریس آیزنهاور، لیست ساده بر اساس اهمیت، یا یه چیدمان دلخواه که خودت می‌سازی؛ از چیدمان‌های پیشنهادی آماده هم می‌تونی به‌جای پیش‌فرض استفاده کنی." },
    { get: function () { return byId("settings-quadrant-section"); },
      title: "۱۲) سهم هر ربع از کارهای روز",
      text: "درصد هر ربع از ماتریس آیزنهاور (مهم و ضروری، مهم و غیرضروری، ضروری و غیرمهم، غیرمهم و غیرضروری) رو با عدد مشخص کن؛ جمعشون باید ۱۰۰٪ بشه. اگه نمی‌خوای عدد یه ربع با تغییر بقیه جابه‌جا بشه، دکمه‌ی «قفل» کنارش رو بزن." },
    { get: function () { return byId("settings-save-btn"); },
      title: "۱۳) ذخیره‌ی تنظیمات",
      text: "بعد از هر تغییری در این صفحه، حتماً این دکمه رو بزن تا ذخیره بشه." }
  ];

  function openSettingsDetailTour() {
    closeTour();
    setTimeout(function () {
      clickIfExists(settingsGearBtn());
      setTimeout(function () {
        activeSteps = settingsDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureAlwSourceRow() { /* alw source list appears after loading a day; no forced expand needed */ }

  var alwDetailSteps = [
    { get: function () { return document.getElementById("alw-search-input"); },
      title: "۱) جستجوی فعالیت",
      text: "وقتی فهرست فعالیت‌های دلخواهت زیاد شد، اسمشو اینجا بنویس و 🔍 رو بزن تا فقط همون‌ها نشون داده بشن." },
    { get: function () { return document.getElementById("alw-new-title"); },
      title: "۲) نام و توضیحات فعالیت جدید",
      text: "اسم فعالیت تکراری‌ای که می‌خوای یک‌بار ذخیره کنی رو اینجا بنویس؛ مثلاً «پختن قرمه‌سبزی». زیرش هم یه باکس توضیحات هست که می‌تونی طرز تهیه یا هر نکته‌ای رو توش بنویسی." },
    { get: function () { return document.getElementById("alw-new-quad"); },
      title: "۳) اهمیت (ماتریس آیزنهاور)",
      text: "یکی از ۴ ربع رو به‌عنوان پیش‌فرض این فعالیت انتخاب کن؛ هر بار که بعداً این فعالیت رو به یه روز اضافه می‌کنی، می‌تونی همون لحظه دوباره عوضش کنی." },
    { get: function () { return document.getElementById("alw-new-time"); },
      title: "۴) ساعت و مکان (اختیاری)",
      text: "اگه این فعالیت معمولاً ساعت یا مکان مشخصی داره (مثلاً «باشگاه، ساعت ۱۸:۰۰»)، همینجا پیش‌فرضش رو ثبت کن." },
    { get: function () { return document.getElementById("alw-new-save"); },
      title: "۵) ذخیره در فعالیت‌های دلخواه",
      text: "با زدن این دکمه، فعالیت به فهرست پایین‌تر اضافه می‌شه." },
    { get: function () { return document.getElementById("alw-list"); },
      title: "۶) فهرست فعالیت‌های دلخواه",
      text: "کنار هر فعالیت سه دکمه هست: «+ افزودن به یک روز» (امروز، فردا یا هر تاریخ دیگه‌ای؛ اهمیت، ساعت و مکانش هم همون لحظه قابل تغییره)، «ویرایش» و «حذف»." },
    { get: function () { return document.getElementById("alw-src-datepicker"); },
      title: "۷) کپی‌کردن فعالیت از یک روز به روز دیگر",
      text: "یه روز رو از این تقویم انتخاب کن و «نمایش کارهای آن روز» رو بزن؛ هر کدوم از کارهای همون روز رو می‌تونی بدون حذف از روز اصلی، به یه روز دیگه کپی کنی یا مستقیم توی فعالیت‌های دلخواه ذخیره‌اش کنی." }
  ];

  function openAlwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("alw-fab"));
      setTimeout(function () {
        activeSteps = alwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  var prwDetailSteps = [
    { get: function () { return document.getElementById("prw-date-mode-row"); },
      title: "۱) بازه‌ی تاریخ",
      text: "اول مشخص کن شمسی کار می‌کنی یا میلادی، بعد بازه‌ی «از تاریخ» تا «تا تاریخ» رو انتخاب کن. اگه فقط یه روز رو می‌خوای، همون یه روز رو هم توی «از» و هم توی «تا» بذار." },
    { get: function () { return document.getElementById("prw-inc-journal"); },
      title: "۲) چی توی خروجی باشه",
      text: "سه گزینه‌ی جدا داری: یادداشت روزانه، کارها (به‌تفکیک ماتریس آیزنهاور) و عکس‌ها. هرکدوم رو نمی‌خوای، تیکش رو بردار." },
    { get: function () { return document.getElementById("prw-mode-row"); },
      title: "۳) رنگی یا سیاه‌وسفید",
      text: "برای چاپ رنگی «رنگی» رو نگه دار؛ اگه با پرینتر سیاه‌وسفید چاپ می‌کنی یا می‌خوای جوهر کمتری مصرف بشه، «سیاه و سفید» رو انتخاب کن." },
    { get: function () { return document.getElementById("prw-build"); },
      title: "۴) ساخت و آماده‌سازی برای چاپ",
      text: "با زدن این دکمه، یه صفحه‌ی آماده‌ی چاپ (A4) از همون بازه ساخته می‌شه. بعدش می‌تونی مستقیم چاپ کنی یا با گزینه‌ی «ذخیره به‌عنوان PDF»ی مرورگر، فایل PDF بگیری." }
  ];

  function openPrwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("prw-fab"));
      setTimeout(function () {
        activeSteps = prwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureSdwTab(tab) {
    var btn = document.querySelector('#sdw-panel .sdw-tabbtn[data-sdwtab="' + tab + '"]');
    if (btn && !btn.classList.contains("active")) btn.click();
  }

  var sdwDetailSteps = [
    { get: function () { return document.querySelector("#sdw-panel .sdw-tabbar"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۱) پنج تب دستیار درس",
      text: "این بخش پنج تب داره: تایمر، برنامه، یادآوری، یادداشت و پشتیبان. هر کدوم برای یه کار متفاوته و کاملاً از هم جدا ذخیره می‌شن. توی این راهنما هر پنج تب رو کامل نشونت می‌دم." },
    { get: function () { return document.getElementById("sdw-clock"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۲) تایمر پومودورو",
      text: "زمان باقی‌مونده‌ی همین دور کار یا استراحت رو نشون می‌ده." },
    { get: function () { return document.getElementById("sdw-start-btn"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۳) شروع، مکث و ریست",
      text: "با «شروع» تایمر رو روشن کن؛ کنارش دکمه‌ی «ریست» هست." },
    { get: function () { return document.getElementById("sdw-tick-check"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۴) صدای تیک‌تاک",
      text: "از اینجا صدای تیک‌تاک ثانیه‌شمار رو روشن یا خاموش کن." },
    { get: function () { return document.getElementById("sdw-dots"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۵) دورهای تکمیل‌شده",
      text: "هر نقطه یعنی یه دور کار تمام‌شده؛ وقتی به تعداد «هر چند دور» تنظیم‌شده برسی، یه استراحت بلند بهت می‌ده." },
    { get: function () { return document.getElementById("sdw-set-work"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۶) زمان‌بندی پومودورو",
      text: "مدت‌زمان کار، استراحت کوتاه، استراحت بلند و اینکه هر چند دور یه استراحت بلند بیاد رو اینجا تنظیم کن و با دکمه‌ی ذخیره ثبتش کن." },
    { get: function () { return document.getElementById("sdw-snd-white"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۷) صداهای پس‌زمینه",
      text: "هنگام مطالعه می‌تونی نویز سفید، نویز قهوه‌ای یا صدای یکنواخت (drone) رو پخش کنی و بلندیش رو با نوار کنارش تنظیم کنی." },
    { get: function () { return document.getElementById("sdw-breathe-circle"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۸) تمرین تنفس",
      text: "برای آروم شدن قبل یا بین دورهای مطالعه، یه دایره‌ی تنفسی داره؛ الگوی تنفس و تعداد دورهاش رو تنظیم کن و با دکمه‌ی شروع/توقف اجراش کن." },
    { get: function () { return document.getElementById("sdw-stat-today"); },
      before: function () { ensureSdwTab("timer"); },
      title: "۹) آمار امروز و این هفته",
      text: "مجموع زمانی که امروز و این هفته با تایمر پومودورو مطالعه کردی، همینجا خلاصه می‌شه." },
    { get: function () { return document.getElementById("sdw-plan-section"); },
      before: function () { ensureSdwTab("plan"); },
      title: "۱۰) برنامه‌ی زمان‌بندی مطالعه",
      text: "مشخص کن امروز (یا هر روز دیگه) چه ساعتی چه درسی می‌خونی — جدا از کارهای روزانه‌ی معمولی." },
    { get: function () { return document.getElementById("sdw-plan-subj"); },
      before: function () { ensureSdwTab("plan"); },
      title: "۱۱) افزودن یه بازه‌ی مطالعه",
      text: "اسم درس، ساعت شروع و ساعت پایان رو وارد کن و با دکمه‌ی افزودن به برنامه اضافه‌اش کن." },
    { get: function () { return document.getElementById("sdw-plan-list"); },
      before: function () { ensureSdwTab("plan"); },
      title: "۱۲) لیست برنامه‌ی روز",
      text: "همه‌ی بازه‌های مطالعه‌ای که برای همون روز ثبت کردی، اینجا لیست می‌شن." },
    { get: function () { return document.getElementById("sdw-plan-week-list"); },
      before: function () { ensureSdwTab("plan"); },
      title: "۱۳) نمای هفته و ماه",
      text: "با فلش‌های بالا بین نمای روز، هفته و ماه جابه‌جا شو تا برنامه‌ی مطالعه‌ت رو در بازه‌ی بزرگ‌تر ببینی." },
    { get: function () { return document.getElementById("sdw-subj-name"); },
      before: function () { ensureSdwTab("review"); },
      title: "۱۴) یادآوری مرور دوره‌ای",
      text: "اسم درس یا مبحث و ساعت دلخواه برای یادآوری رو وارد کن و «+ افزودن به برنامه مرور» رو بزن. مرورهای بعدی خودکار با فاصله‌ی افزایشی (پیش‌فرض علمی: ۱، ۳، ۷، ۱۶، ۳۰ روز) توی همون ساعت یادآوری می‌شن." },
    { get: function () { return document.getElementById("sdw-fivl-list"); },
      before: function () { ensureSdwTab("review"); },
      title: "۱۵) فاصله‌های پیش‌فرض مرور",
      text: "این فاصله‌ها رو می‌تونی از اینجا تغییر بدی، فاصله‌ی جدید اضافه کنی، یا با دکمه‌ی ریست به حالت پیش‌فرض برگردونی." },
    { get: function () { return document.getElementById("sdw-subj-list"); },
      before: function () { ensureSdwTab("review"); },
      title: "۱۶) لیست درس‌های زیر مرور",
      text: "همه‌ی درس‌هایی که برای مرور دوره‌ای ثبت کردی و مرحله‌ی فعلی هر کدوم اینجا لیست می‌شه." },
    { get: function () { return document.getElementById("sdw-notesubj-new"); },
      before: function () { ensureSdwTab("notes"); },
      title: "۱۷) موضوع یادداشت",
      text: "یه موضوع (مثلاً «شیمی») بساز یا از موضوع‌های قبلی انتخاب کن؛ هر موضوع، یادداشت‌های خودش رو جدا نگه می‌داره." },
    { get: function () { return document.getElementById("sdw-note-input"); },
      before: function () { ensureSdwTab("notes"); },
      title: "۱۸) افزودن یادداشت",
      text: "متن یادداشتت رو زیر همون موضوع بنویس و با دکمه‌ی افزودن ثبتش کن." },
    { get: function () { return document.getElementById("sdw-notes-list"); },
      before: function () { ensureSdwTab("notes"); },
      title: "۱۹) لیست یادداشت‌های همین موضوع",
      text: "همه‌ی یادداشت‌هایی که زیر موضوع فعلی ثبت کردی، اینجا نشون داده می‌شن." },
    { get: function () { return document.getElementById("sdw-backup-download-btn"); },
      before: function () { ensureSdwTab("backup"); },
      title: "۲۰) پشتیبانِ فقط همین بخش",
      text: "این پشتیبان فقط شامل اطلاعات «دستیار درس» می‌شه (زمان مطالعه، برنامه مرور دوره‌ای، برنامه زمان‌بندی و یادداشت‌های درسی) و کاری به بقیه‌ی بولت ژورنال نداره. اگه بخوای، می‌تونی بازه‌ی تاریخ رو هم مشخص کنی تا فقط همون بازه دانلود بشه." },
    { get: function () { return document.getElementById("sdw-backup-upload-btn"); },
      before: function () { ensureSdwTab("backup"); },
      title: "۲۱) بازیابی از فایل پشتیبان",
      text: "فایل پشتیبان قبلی رو از اینجا بارگذاری کن؛ می‌تونی انتخاب کنی اطلاعات فعلی کامل جایگزین بشه یا فقط اضافه/به‌روزرسانی انجام بشه." }
  ];


  function openSdwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("sdw-fab"));
      setTimeout(function () {
        activeSteps = sdwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensurePjwDetailOpen() {
    if (document.getElementById("pjw-detail-title")) return;
    var card = document.querySelector(".pjw-card");
    if (card) card.click();
  }

  var pjwDetailSteps = [
    { get: function () { return document.getElementById("pjw-new-title"); },
      title: "۱) ساختن پروژه‌ی جدید",
      text: "عنوان پروژه رو اینجا بنویس و «+ افزودن» رو بزن؛ مثلاً «راه‌اندازی وب‌سایت شخصی»." },
    { get: function () { return document.getElementById("pjw-tab-active"); },
      title: "۲) تب‌های فعال و تکمیل‌شده",
      text: "پروژه‌های در حال انجام زیر تب «فعال» هستن؛ پروژه‌ای که وضعیتش رو «تکمیل‌شده» کنی، می‌ره زیر تب «تکمیل‌شده»." },
    { get: function () { return document.querySelector(".pjw-card"); },
      title: "۳) کارت پروژه",
      text: "روی هر پروژه بزن تا واردش بشی؛ نوار پیشرفتش هم بر اساس ریزکارهای تیک‌خورده‌ش خودکار محاسبه می‌شه." },
    { get: function () { return document.getElementById("pjw-detail-title"); },
      before: ensurePjwDetailOpen,
      title: "۴) عنوان و درصد پیشرفت",
      text: "بالای صفحه‌ی جزئیات، عنوان پروژه (قابل ویرایش) و درصد کلی پیشرفتش رو می‌بینی." },
    { get: function () { return document.getElementById("pjw-detail-status"); },
      before: ensurePjwDetailOpen,
      title: "۵) وضعیت و موعد تحویل",
      text: "وضعیت پروژه رو بین «در حال انجام»، «متوقف‌شده» و «تکمیل‌شده» عوض کن؛ کنارش هم یه موعد تحویل (تاریخ هدف) می‌تونی تعیین کنی." },
    { get: function () { return document.getElementById("pjw-task-input"); },
      before: ensurePjwDetailOpen,
      title: "۶) ریزکارها (تجزیه‌ی پروژه)",
      text: "پروژه رو به کارهای کوچیک‌تر بشکن؛ هر ریزکار می‌تونه ساعت و توضیحات جدا هم داشته باشه. با تیک زدن هر ریزکار، درصد پیشرفت کل پروژه خودکار به‌روز می‌شه." },
    { get: function () { return document.getElementById("pjw-mile-input"); },
      before: ensurePjwDetailOpen,
      title: "۷) نقاط عطف (Milestones)",
      text: "لحظه‌های مهم تصمیم یا تحویل رو با یه عنوان و تاریخ ثبت کن؛ مثلاً «انتشار نسخه‌ی اول»." },
    { get: function () { return document.getElementById("pjw-detail-notes"); },
      before: ensurePjwDetailOpen,
      title: "۸) یادداشت‌ها، ریسک‌ها و حذف پروژه",
      text: "پایین صفحه یه باکس یادداشت برای موانع و تصمیم‌ها هست، و زیرش دکمه‌ی «حذف این پروژه» — برای وقتی که پروژه دیگه لازم نیست." }
  ];

  function openPjwDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("pjw-fab"));
      setTimeout(function () {
        activeSteps = pjwDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureAdhdAdvancedOpen() {
    var content = document.getElementById("adhd-advanced-content");
    if (content && content.style.display === "none") {
      var header = document.getElementById("adhd-advanced-header");
      if (header) header.click();
    }
  }

  var adhdDetailSteps = [
    { get: function () { return document.getElementById("adhd-status"); },
      title: "۱) وضعیت فعلی حالت تمرکز",
      text: "همیشه بالای پنل نشون می‌ده حالت تمرکز الان خاموشه، یا فقط بصری یا کل اپ فعاله." },
    { get: function () { return document.querySelector(".adhd-segment"); },
      title: "۲) سه سطح تغییر",
      text: "«فقط بصری» بدون رفرش فوری اعمال می‌شه: انیمیشن‌ها خاموش، چک‌باکس‌ها بزرگ‌تر، فاصله‌ی خطوط بیشتر. «کل اپ» علاوه بر همه‌ی اینا، چیدمان صفحه‌ی امروز رو از دسته‌بندی می‌بره روی یه لیست ساده‌ی بر اساس اهمیت و ردیف آیکون‌های بالا رو جمع می‌کنه؛ خاموش که کنی، همه‌چیز دقیقاً برمی‌گرده به قبل." },
    { get: function () { return document.getElementById("adhd-next-box"); },
      title: "۳) «روی همین یکی، الان»",
      text: "به‌جای کل لیست کارهای امروز که ممکنه سردرگم‌ت کنه، فقط یه کار رو در لحظه نشون می‌ده — همونی که بیشترین اولویت رو داره. وقتی «تمومش کردم» رو بزنی، کار بعدی میاد." },
    { get: function () { return document.getElementById("adhd-timer-presets"); },
      title: "۴) تایمر تمرکز",
      text: "اگه شروع کردن سخته، «فقط ۲ دقیقه» رو بزن — این عدد عمداً خیلی کوچیکه تا ذهن ازش فرار نکنه. پیش‌فرض‌های دیگه (۲۵/۵، ۱۵/۵، ۵۰/۱۰) هم برای کار/استراحت واقعی هستن؛ ۵ دقیقه مونده به پایان هم بهت هشدار می‌ده." },
    { get: function () { return document.getElementById("adhd-park-input"); },
      title: "۵) دفترچه‌ی فکرهای پرت",
      text: "وسط یه کار که یه فکر جدید به ذهنت رسید («یادم رفت زنگ بزنم»)، به‌جای دنبال کردنش همین‌جا در یک خط بنویسش و بعداً که وقت داشتی مرورش کن یا مستقیم بفرستش به کارهای امروز." },
    { get: function () { return document.getElementById("adhd-advanced-content"); },
      before: ensureAdhdAdvancedOpen,
      title: "۶) گزینه‌های پیشرفته",
      text: "سه تنظیم اینجاست: کم‌رنگ کردن بقیه‌ی کارها وقتی «کل اپ» روشنه (پیش‌فرض: روشن)، تشخیص مهم‌ترین کار بر اساس نزدیک‌ترین زمان به‌جای فقط بالاترین سطح اهمیت (پیش‌فرض: روشن)، و ثابت نگه‌داشتن آیکون‌های شناور به‌جای جمع‌شدنشون (پیش‌فرض: خاموش)." }
  ];

  function openAdhdDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("adhd-fab"));
      setTimeout(function () {
        activeSteps = adhdDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureLangTab(tab) {
    var btn = document.querySelector('#lang-tabbar .lang-tab[data-langtab="' + tab + '"]');
    if (btn && !btn.classList.contains("active")) btn.click();
  }

  var langDetailSteps = [
    { get: function () { return document.getElementById("lang-tabbar"); },
      before: function () { ensureLangTab("today"); },
      title: "۱) چهار تب زبان‌آموز",
      text: "امروز (مرور روزانه)، آزمون (تست یه بازه‌ی تاریخ)، واژه‌ها (افزودن و فهرست) و یادداشت (یادداشت‌ها و اهداف). توی این راهنما هر چهار تب رو کامل نشونت می‌دم." },
    { get: function () { return document.getElementById("lang-info-btn"); },
      before: function () { ensureLangTab("today"); },
      title: "۲) روش کار و منطق پشتش",
      text: "با زدن این دکمه توضیح می‌ده که این بخش بر پایه‌ی «فاصله‌گذاری مرور» (مرور با فاصله‌ی زمانی رشدیابنده) و «اثر بازیابی» (تلاش برای یادآوری قبل از دیدن جواب) کار می‌کنه — دو روش اثبات‌شده برای یادگیری بهتر زبان." },
    { get: function () { return document.getElementById("lang-stats"); },
      before: function () { ensureLangTab("today"); },
      title: "۳) آمار بالای صفحه",
      text: "تعداد واژه‌هایی که امروز باید مرور کنی، و آمار کلی واژه‌هات، همینجا خلاصه نشون داده می‌شه." },
    { get: function () { return document.getElementById("lang-dir-row"); },
      before: function () { ensureLangTab("today"); },
      title: "۴) جهت مرور",
      text: "انتخاب کن مرور روزانه به‌صورت «ترجمه» (واژه به معنی)، «ترجمه معکوس» (معنی به واژه) یا «ترکیبی تصادفی» انجام بشه." },
    { get: function () { return document.getElementById("lang-allmode-toggle"); },
      before: function () { ensureLangTab("today"); },
      title: "۵) مرور همه‌ی واژه‌ها (بدون توجه به زمان‌بندی)",
      text: "اگه این گزینه رو فعال کنی، به‌جای اینکه فقط واژه‌های سررسیده‌ی امروز رو ببینی، همه‌ی واژه‌هایی که تا الان اضافه کردی رو یکجا مرور می‌کنی — خوب برای مرور فشرده‌ی قبل از امتحان." },
    { get: function () { return document.getElementById("lang-ivl-header"); },
      before: function () { ensureLangTab("today"); },
      title: "۶) فاصله‌های مرور",
      text: "این بخش رو باز کن تا فاصله‌های زمانی مرور (مثلاً ۱ روز، ۳ روز، ۷ روز...) رو ببینی و در صورت نیاز فاصله‌ی جدید اضافه یا فاصله‌ها رو به حالت پیش‌فرض برگردونی." },
    { get: function () { return document.getElementById("lang-review-box"); },
      before: function () { ensureLangTab("today"); },
      title: "۷) کارت مرور و ثبت جواب",
      text: "واژه نشون داده می‌شه؛ جوابت رو توی باکس بنویس و «بررسی جواب» رو بزن تا درست یا غلط بودنش مشخص بشه." },
    { get: function () { return document.getElementById("lang-know-btn"); },
      before: function () { ensureLangTab("today"); },
      title: "۸) بلد بودم / بلد نبودم",
      text: "اگه جوابت درست بود، با دکمه‌ی سبز «بعدی ✅» فاصله‌ی مرور بعدیِ همون واژه بیشتر می‌شه؛ اگه غلط بود، با دکمه‌ی نارنجی فاصله‌اش دوباره از اول کوتاه می‌شه." },
    { get: function () { return document.getElementById("lang-finish-btn"); },
      before: function () { ensureLangTab("today"); },
      title: "۹) پایان مرور دسته‌جمعی",
      text: "توی حالت «مرور همه‌ی واژه‌ها»، هر وقت خواستی زودتر تموم کنی، این دکمه رو بزن." },
    { get: function () { return document.getElementById("lang-front-input"); },
      before: function () { ensureLangTab("words"); },
      title: "۱۰) افزودن واژه‌ی جدید",
      text: "واژه یا عبارت رو بنویس، معنیش رو (اگه چند معنی داره، با ویرگول جدا کن) و اگه خواستی یه جمله‌ی مثال هم اضافه کن." },
    { get: function () { return document.getElementById("lang-add-btn"); },
      before: function () { ensureLangTab("words"); },
      title: "۱۱) افزودن به جعبه‌ی مرور",
      text: "با زدن این دکمه، واژه به جعبه‌ی مرور فاصله‌دار اضافه می‌شه و فردا اولین مرورش شروع می‌شه." },
    { get: function () { return document.getElementById("lang-word-list"); },
      before: function () { ensureLangTab("words"); },
      title: "۱۲) لیست واژه‌های من",
      text: "همه‌ی واژه‌هایی که تا الان اضافه کردی، با معنی و مثالشون، اینجا لیست می‌شن؛ می‌تونی ویرایش یا حذفشون کنی." },
    { get: function () { return document.getElementById("lang-confirm-delete-toggle"); },
      before: function () { ensureLangTab("words"); },
      title: "۱۳) تأیید قبل از حذف",
      text: "اگه این گزینه فعال باشه، قبل از حذف هر واژه یه بار ازت تأیید می‌گیره تا اشتباهی چیزی پاک نشه." },
    { get: function () { return document.getElementById("lang-dt-mode-toggle"); },
      before: function () { ensureLangTab("test"); },
      title: "۱۴) حالت آزمون",
      text: "می‌تونی بین حالت‌های مختلف آزمون‌گیری (مثلاً ترجمه یا ترجمه‌ی معکوس) جابه‌جا بشی." },
    { get: function () { return document.getElementById("lang-dt-from-picker"); },
      before: function () { ensureLangTab("test"); },
      title: "۱۵) بازه‌ی تاریخ آزمون",
      text: "بازه‌ی «از تاریخ» تا «تا تاریخ» (شمسی یا میلادی) رو انتخاب کن تا فقط واژه‌هایی که توی همون بازه اضافه کردی امتحان بشن." },
    { get: function () { return document.getElementById("lang-dt-start-btn"); },
      before: function () { ensureLangTab("test"); },
      title: "۱۶) شروع آزمون",
      text: "بعد از انتخاب بازه، این دکمه رو بزن تا آزمون شروع بشه. این آزمون جدا از مرور روزانه‌ست و روی فاصله‌گذاری واژه‌ها اثر نمی‌ذاره." },
    { get: function () { return document.getElementById("lang-dt-answer-input"); },
      before: function () { ensureLangTab("test"); },
      title: "۱۷) پاسخ به سؤال آزمون",
      text: "جوابت رو بنویس و «بررسی جواب» رو بزن تا درست یا غلط بودنش مشخص بشه." },
    { get: function () { return document.getElementById("lang-dt-result"); },
      before: function () { ensureLangTab("test"); },
      title: "۱۸) نتیجه‌ی آزمون",
      text: "بعد از پاسخ به همه‌ی سؤال‌ها، نتیجه‌ی کلی (چند تا درست و چند تا غلط) اینجا نشون داده می‌شه؛ می‌تونی با «بعدی» ادامه بدی یا با «بستن نتیجه» تمومش کنی." },
    { get: function () { return document.getElementById("lang-note-input"); },
      before: function () { ensureLangTab("notes"); },
      title: "۱۹) یادداشت یا هدف جدید",
      text: "یادداشت یا هدفی درباره‌ی یادگیری زبانت بنویس؛ مثلاً «این هفته ۲۰ واژه‌ی جدید یاد بگیر»." },
    { get: function () { return document.getElementById("lang-note-list"); },
      before: function () { ensureLangTab("notes"); },
      title: "۲۰) لیست یادداشت‌ها و اهداف",
      text: "همه‌ی یادداشت‌ها و اهدافی که ثبت کردی اینجا لیست می‌شن؛ کنار هر کدوم یه چک‌باکسه که هر وقت بهش رسیدی، تیکش می‌زنی." }
  ];


  function openLangDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("lang-fab"));
      setTimeout(function () {
        activeSteps = langDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }

  function ensureFinTab(key) {
    var btn = document.querySelector('#fin-tabs .fin-tab[data-fintab="' + key + '"]');
    if (btn && !btn.classList.contains("fin-tab-active")) btn.click();
  }

  var finDetailSteps = [
    { get: function () { return document.getElementById("fin-tabs"); },
      before: function () { ensureFinTab("exp"); },
      title: "۱) شش تب مدیریت مالی",
      text: "هزینه‌ها، اهداف (پس‌انداز)، بدهی، بودجه، دارایی و اثر تورمی؛ هر تب یه بخش کاملاً جدا از پول‌ت رو نشون می‌ده. توی این راهنما همه‌ی این شش تب رو یکی‌یکی و کامل بهت نشون می‌دم." },
    { get: function () { return document.getElementById("fexp-unit-toggle"); },
      before: function () { ensureFinTab("exp"); },
      title: "۲) واحد پول و اعداد",
      text: "بالای این تب می‌تونی بین ریال و تومان، و بین اعداد فارسی و انگلیسی جابه‌جا بشی؛ همه‌ی مبلغ‌های همین تب با همون واحد نشون داده می‌شن." },
    { get: function () { return document.getElementById("fexp-income-input"); },
      before: function () { ensureFinTab("exp"); },
      title: "۳) درآمد ماهانه",
      text: "درآمد ماهانه‌ت رو اینجا وارد و ذخیره کن تا باقی محاسبه‌های این تب (مثل نمودار هزینه‌ها) بر همون اساس باشه." },
    { get: function () { return document.getElementById("fexp-wage-input"); },
      before: function () { ensureFinTab("exp"); },
      title: "۴) دستمزد ساعتی و ارزش زمان",
      text: "دستمزد ساعتی‌تو وارد کن؛ اپ نشونت می‌ده هر هزینه معادل چند ساعت از وقتت هست — دیدن این عدد کمک می‌کنه خرجی‌های الکی رو راحت‌تر تشخیص بدی." },
    { get: function () { return document.getElementById("fexp-amount-input"); },
      before: function () { ensureFinTab("exp"); },
      title: "۵) ثبت هزینه یا درآمد",
      text: "مبلغ، توضیح کوتاه و دسته (مثلاً «خوراک») رو وارد کن و با دکمه‌ی کنارش ثبتش کن." },
    { get: function () { return document.getElementById("fexp-cat-toggle"); },
      before: function () { ensureFinTab("exp"); },
      title: "۶) دسته‌بندی‌ها",
      text: "از اینجا دسته‌های جدید برای هزینه یا درآمد بساز، براشون رنگ انتخاب کن، و مشخص کن دسته مربوط به هزینه‌ست یا درآمد." },
    { get: function () { return document.getElementById("fexp-cal-toggle"); },
      before: function () { ensureFinTab("exp"); },
      title: "۷) تقویم هزینه‌ها",
      text: "تقویم ماهانه‌ی این تب رو باز کن تا ببینی کدوم روزها هزینه یا درآمد ثبت کردی؛ با فلش‌های کنارش بین ماه‌ها جابه‌جا شو." },
    { get: function () { return document.getElementById("fexp-chart"); },
      before: function () { ensureFinTab("exp"); },
      title: "۸) نمودار هزینه‌ها",
      text: "نمودار دایره‌ای هزینه‌ها رو به‌تفکیک دسته اینجا می‌بینی؛ زیرش هم راهنمای رنگ هر دسته هست." },
    { get: function () { return document.getElementById("fexp-saved-toggle-btn"); },
      before: function () { ensureFinTab("exp"); },
      title: "۹) هزینه‌های ذخیره‌شده و جستجو",
      text: "هزینه‌های تکراری رو می‌تونی ستاره‌دار (⭐) کنی تا بعداً سریع پیدا و دوباره ثبتشون کنی؛ از باکس جستجو هم برای پیدا کردن یه هزینه‌ی خاص استفاده کن." },
    { get: function () { return document.getElementById("fsav-goal-name-input"); },
      before: function () { ensureFinTab("sav"); },
      title: "۱۰) ساخت هدف پس‌انداز",
      text: "یه هدف مثل «خرید لپ‌تاپ» بساز: اسم، مبلغ هدف، مبلغ فعلاً پس‌انداز‌شده، مدت زمان و دسته رو وارد کن و با دکمه‌ی اضافه کردن ثبتش کن." },
    { get: function () { return document.getElementById("fsav-goals-list"); },
      before: function () { ensureFinTab("sav"); },
      title: "۱۱) لیست اهداف و پیشرفت",
      text: "همه‌ی اهداف پس‌اندازت با نوار پیشرفتشون اینجا لیست می‌شن؛ هر چقدر بیشتر پس‌انداز کنی، نوار پرتر می‌شه." },
    { get: function () { return document.getElementById("fsav-archived-toggle"); },
      before: function () { ensureFinTab("sav"); },
      title: "۱۲) اهداف آرشیوشده",
      text: "هدفی که تمومش کردی یا دیگه لازمش نداری رو می‌تونی آرشیو کنی؛ از اینجا لیست اهداف آرشیوشده رو می‌بینی." },
    { get: function () { return document.getElementById("fsav-networth-input"); },
      before: function () { ensureFinTab("sav"); },
      title: "۱۳) محاسبه‌ی ارزش خالص",
      text: "سن، درآمد و ارزش خالص فعلیت رو وارد کن تا اپ بهت بگه نسبت به سنت وضعیت مالیت چطوره؛ نتیجه رو همینجا ذخیره کن." },
    { get: function () { return document.getElementById("fsav-formula-info-btn"); },
      before: function () { ensureFinTab("sav"); },
      title: "۱۴) فرمول محاسبات",
      text: "اگه بخوای بدونی این تب دقیقاً چطور محاسبه می‌کنه، روی این دکمه بزن تا فرمول‌های استفاده‌شده رو ببینی." },
    { get: function () { return document.getElementById("fdebt-name-input"); },
      before: function () { ensureFinTab("debt"); },
      title: "۱۵) ثبت بدهی یا وام",
      text: "اسم بدهی (مثلاً «وام بانک») و مبلغ مونده‌ش رو وارد کن و با دکمه‌ی اضافه کردن ثبتش کن." },
    { get: function () { return document.getElementById("fdebt-list"); },
      before: function () { ensureFinTab("debt"); },
      title: "۱۶) لیست بدهی‌ها و مجموع",
      text: "همه‌ی بدهی‌هایی که ثبت کردی اینجا لیست می‌شن و مجموع کل بدهی‌ت پایینش نشون داده می‌شه." },
    { get: function () { return document.getElementById("fdebt-starter-target"); },
      before: function () { ensureFinTab("debt"); },
      title: "۱۷) صندوق اضطراری اولیه",
      text: "قبل از پرداخت بدهی، این تب پیشنهاد می‌ده یه صندوق اضطراری کوچیک بسازی؛ مبلغ هدف رو وارد کن و پیشرفتش رو ثبت کن." },
    { get: function () { return document.getElementById("fdebt-full-monthly"); },
      before: function () { ensureFinTab("debt"); },
      title: "۱۸) برنامه‌ی کامل پرداخت بدهی",
      text: "بعد از صندوق اولیه، اینجا می‌تونی مبلغ ماهانه‌ای که می‌تونی برای پرداخت بدهی کنار بذاری رو وارد کنی تا مدت‌زمان تخمینی پاک شدن بدهی‌ت رو ببینی." },
    { get: function () { return document.getElementById("fdebt-steps"); },
      before: function () { ensureFinTab("debt"); },
      title: "۱۹) پله‌های پیشنهادی و فرمول",
      text: "این تب یه برنامه‌ی پله‌ای برای اولویت‌بندی و پرداخت بدهی‌ها بهت پیشنهاد می‌ده؛ برای دیدن فرمول پشت این محاسبات، دکمه‌ی «فرمول» رو بزن." },
    { get: function () { return document.getElementById("fcsp-income-input"); },
      before: function () { ensureFinTab("csp"); },
      title: "۲۰) درآمد برای بودجه‌بندی",
      text: "درآمد ماهانه‌ت رو اینجا وارد کن؛ این عدد پایه‌ی محاسبه‌ی سقف پیشنهادی هر دسته‌ی بودجه می‌شه." },
    { get: function () { return document.getElementById("fcsp-buckets"); },
      before: function () { ensureFinTab("csp"); },
      title: "۲۱) سقف هر دسته",
      text: "برای هر دسته (خوراک، پوشاک، حمل‌ونقل...) یه سقف ماهانه تعیین کن؛ وقتی هزینه‌هات به این سقف نزدیک بشه، هشدار می‌گیری." },
    { get: function () { return document.getElementById("fcsp-total-check"); },
      before: function () { ensureFinTab("csp"); },
      title: "۲۲) جمع‌بندی بودجه",
      text: "این بخش نشون می‌ده مجموع سقف‌هایی که برای دسته‌ها تعیین کردی، از درآمدت بیشتره یا کمتر — برای اینکه بودجه‌بندیت واقع‌بینانه باشه." },
    { get: function () { return document.getElementById("fcsp-formula-info-btn"); },
      before: function () { ensureFinTab("csp"); },
      title: "۲۳) فرمول بودجه‌بندی",
      text: "برای دیدن اینکه سقف پیشنهادی هر دسته چطور محاسبه می‌شه، این دکمه رو بزن." },
    { get: function () { return document.getElementById("fasl-a-name-input"); },
      before: function () { ensureFinTab("asl"); },
      title: "۲۴) ثبت دارایی",
      text: "دارایی‌هات (پول نقد، ملک، سرمایه‌گذاری...) رو با اسم، ارزش فعلی و جریان نقدی ماهانه (اگه داره) اینجا ثبت کن." },
    { get: function () { return document.getElementById("fasl-a-list"); },
      before: function () { ensureFinTab("asl"); },
      title: "۲۵) لیست دارایی‌ها و مجموع",
      text: "همه‌ی دارایی‌های ثبت‌شده و مجموع ارزششون رو اینجا می‌بینی." },
    { get: function () { return document.getElementById("fasl-l-name-input"); },
      before: function () { ensureFinTab("asl"); },
      title: "۲۶) ثبت بدهی (در بخش دارایی‌ها)",
      text: "پایین همین تب یه بخش جدا برای بدهی‌هاته؛ اسم و مبلغ هر بدهی رو اینجا وارد کن." },
    { get: function () { return document.getElementById("fasl-l-list"); },
      before: function () { ensureFinTab("asl"); },
      title: "۲۷) لیست بدهی‌ها و مجموع",
      text: "همه‌ی بدهی‌های ثبت‌شده در این تب و مجموعشون اینجا نشون داده می‌شه." },
    { get: function () { return document.getElementById("fasl-summary"); },
      before: function () { ensureFinTab("asl"); },
      title: "۲۸) ارزش خالص",
      text: "ارزش خالص یعنی مجموع دارایی‌ها منهای مجموع بدهی‌ها؛ این عدد خودکار از روی چیزهایی که بالاتر ثبت کردی محاسبه می‌شه." },
    { get: function () { return document.getElementById("fasl-formula-info-btn"); },
      before: function () { ensureFinTab("asl"); },
      title: "۲۹) فرمول محاسبه",
      text: "برای دیدن فرمول دقیق محاسبه‌ی ارزش خالص، این دکمه رو بزن." },
    { get: function () { return document.getElementById("finf-erosion-amount"); },
      before: function () { ensureFinTab("inf"); },
      title: "۳۰) قدرت خرید پول در طول زمان",
      text: "مبلغی که داری رو وارد کن تا ببینی با یه نرخ تورم فرضی، بعد از چند سال ارزشش چقدر کاهش پیدا می‌کنه." },
    { get: function () { return document.getElementById("finf-future-price"); },
      before: function () { ensureFinTab("inf"); },
      title: "۳۱) محاسبه‌گر قیمت آینده",
      text: "قیمت فعلی یه کالا، نرخ تورم و تعداد سال رو وارد کن تا قیمت تخمینی آینده‌ش رو ببینی." },
    { get: function () { return document.getElementById("finf-rate-old"); },
      before: function () { ensureFinTab("inf"); },
      title: "۳۲) محاسبه‌ی نرخ تورم از دو قیمت",
      text: "اگه قیمت قدیم و جدید یه کالا رو داری، اینجا وارد کن تا نرخ تورم واقعی همون کالا محاسبه بشه." },
    { get: function () { return document.getElementById("finf-inv-principal"); },
      before: function () { ensureFinTab("inf"); },
      title: "۳۳) سود سرمایه‌گذاری واقعی بعد از تورم",
      text: "مبلغ سرمایه‌گذاری، نرخ بازده، نرخ تورم، کارمزد و مالیات رو وارد کن تا سود واقعی (بعد از کسر تورم) رو ببینی." },
    { get: function () { return document.getElementById("finf-formula-info-btn"); },
      before: function () { ensureFinTab("inf"); },
      title: "۳۴) فرمول‌ها",
      text: "برای دیدن فرمول دقیق هر کدوم از این چهار محاسبه‌گر (فرسایش ارزش، قیمت آینده، نرخ تورم و سود واقعی)، این دکمه رو بزن." }
  ];


  function openFinDetailTour() {
    closeTour();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      clickIfExists(byId("fin-fab"));
      setTimeout(function () {
        activeSteps = finDetailSteps;
        showStep(0);
      }, 250);
    }, 200);
  }


  function showDetailStep(step) {
    activeSteps = [step];
    showStep(0);
  }

  for (var qsi = 0; qsi < quickSteps.length; qsi++) {
    (function (idx) {
      if (!quickSteps[idx].detail) {
        quickSteps[idx].detail = function () { showDetailStep(fullSteps[idx]); };
      }
    })(qsi);
  }

  var activeSteps = quickSteps;
  var curStep = -1;

  // When "توضیح کامل" is tapped mid-tour, we swap activeSteps to a detail
  // sub-tour. resumeSteps/resumeIndex remember where to pick the outer tour
  // back up once that sub-tour naturally finishes (see showStep below).
  var resumeSteps = null;
  var resumeIndex = 0;
  function clearResume() { resumeSteps = null; resumeIndex = 0; }

  var pndDemoActive = false;
  function closeTour() {
    blocker.style.display = "none";
    spot.style.display = "none";
    tip.style.display = "none";
    curStep = -1;
    stepBusy = false;
    if (tipNextBtn) { tipNextBtn.disabled = false; tipNextBtn.style.opacity = ""; tipNextBtn.style.pointerEvents = ""; }
    if (tipPrevBtn) { tipPrevBtn.disabled = false; tipPrevBtn.style.pointerEvents = ""; }
    if (pndDemoActive) { pndDemoActive = false; if (window.bjPndDemo) window.bjPndDemo.remove(); }
  }
  blocker.addEventListener("click", function () { clearResume(); closeTour(); markSeen(); });

  var stepGen = 0;
  var stepBusy = false;
  function lockNav() { stepBusy = true; tipNextBtn.disabled = true; tipNextBtn.style.opacity = "0.55"; tipNextBtn.style.pointerEvents = "none"; tipPrevBtn.disabled = true; tipPrevBtn.style.pointerEvents = "none"; }
  function unlockNav() { stepBusy = false; tipNextBtn.disabled = false; tipNextBtn.style.opacity = ""; tipNextBtn.style.pointerEvents = ""; tipPrevBtn.style.pointerEvents = ""; tipPrevBtn.disabled = (curStep <= 0); }
  function showStep(i) {
    if (i >= activeSteps.length) {
      if (resumeSteps) {
        var backSteps = resumeSteps, backIndex = resumeIndex;
        clearResume();
        closeTour();
        setTimeout(function () {
          activeSteps = backSteps;
          showStep(backIndex);
        }, 250);
        return;
      }
      closeTour();
      return;
    }
    lockNav();
    stepGen++;
    var myGen = stepGen;
    curStep = i;
    var step = activeSteps[i];
    var target = null, tries = 0;
    function attempt() {
      if (myGen !== stepGen) return;
      try { target = step.get(); } catch (e) { target = null; }
      if (target && (!target.isConnected || !target.getBoundingClientRect)) target = null;
      if (!target && tries < 20) { tries++; setTimeout(attempt, 75); return; }
      if (!target) { showStep(i + 1); return; }
      try { target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
      waitForStableRect(target, function () {
        if (myGen !== stepGen) return;
        try { renderStep(i, target); } catch (e) { closeTour(); }
      });
    }
    if (step.before) { step.before(); setTimeout(attempt, 180); } else { attempt(); }
  }

  // Smooth-scroll animations take longer than a fixed timeout can reliably predict,
  // so instead of guessing a delay, poll the target's position every frame until it
  // stops moving (same rect on two consecutive frames) before measuring/positioning
  // the spotlight + tooltip. This prevents the highlight from landing on a stale
  // (mid-scroll) position while the described element ends up somewhere else.
  function waitForStableRect(target, cb) {
    var lastRect = null, stableFrames = 0, frames = 0, maxFrames = 60;
    function tick() {
      if (!target.isConnected) { cb(); return; }
      var r = target.getBoundingClientRect();
      var key = r.top + "," + r.left + "," + r.width + "," + r.height;
      if (key === lastRect) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastRect = key;
      }
      frames++;
      if (stableFrames >= 3 || frames >= maxFrames) { cb(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderStep(i, target) {
    var r = target.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { showStep(i + 1); return; }
    var pad = 8;
    spot.style.display = "block";
    blocker.style.display = "block";
    spot.style.left = (r.left - pad) + "px";
    spot.style.top = (r.top - pad) + "px";
    spot.style.width = (r.width + pad * 2) + "px";
    spot.style.height = (r.height + pad * 2) + "px";

    tipStepEl.textContent = "مرحله‌ی " + (i + 1) + " از " + activeSteps.length;
    tipTitleEl.textContent = activeSteps[i].title;
    tipTextEl.textContent = activeSteps[i].text;
    if (activeSteps[i].note) {
      tipNoteEl.textContent = "⭐ " + activeSteps[i].note;
      tipNoteEl.style.display = "block";
    } else {
      tipNoteEl.textContent = "";
      tipNoteEl.style.display = "none";
    }
    tipNextBtn.textContent = (i === activeSteps.length - 1) ? "پایان" : "بعدی";
    tipDetailBtn.style.display = activeSteps[i].detail ? "inline-block" : "none";
    tipPrevBtn.disabled = (i <= 0);
    tip.style.display = "block";

    var tipRect = tip.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var top;
    if (r.bottom + 16 + tipRect.height < vh) top = r.bottom + 16;
    else if (r.top - 16 - tipRect.height > 0) top = r.top - 16 - tipRect.height;
    else top = Math.max(16, (vh - tipRect.height) / 2);
    var left = Math.min(Math.max(r.left + r.width / 2 - tipRect.width / 2, 16), vw - tipRect.width - 16);
    tip.style.top = top + "px";
    tip.style.left = left + "px";
    unlockNav();
  }

  tipNextBtn.addEventListener("click", function () { if (stepBusy) return; showStep(curStep + 1); });
  tipPrevBtn.addEventListener("click", function () { if (stepBusy || curStep <= 0) return; showStep(curStep - 1); });
  tipSkipBtn.addEventListener("click", function () { clearResume(); closeTour(); markSeen(); });
  tipDetailBtn.addEventListener("click", function () {
    if (curStep >= 0 && activeSteps[curStep] && activeSteps[curStep].detail) {
      resumeSteps = activeSteps;
      resumeIndex = curStep + 1;
      activeSteps[curStep].detail();
    }
  });
  window.addEventListener("resize", function () {
    if (curStep >= 0) { var t = activeSteps[curStep].get(); if (t) renderStep(curStep, t); }
  });
  window.addEventListener("scroll", function () {
    if (curStep >= 0) { var t = activeSteps[curStep].get(); if (t) renderStep(curStep, t); }
  }, true);

  function startTour(steps) {
    clearResume();
    welcomeOverlay.style.display = "none";
    markSeen();
    if (window.bjCloseSettings) window.bjCloseSettings();
    setTimeout(function () {
      activeSteps = steps;
      showStep(0);
    }, 250);
  }

  window.bjStartOnboardingTour = function () { startTour(quickSteps); };
  window.bjStartFullGuide = function () { startTour(fullSteps); };

  document.getElementById("onb-btn-yes").addEventListener("click", function () {
    welcomeOverlay.style.display = "none";
    document.getElementById("onb-ready-overlay").style.display = "flex";
  });
  document.getElementById("onb-btn-ready-go").addEventListener("click", function () {
    document.getElementById("onb-ready-overlay").style.display = "none";
    window.bjStartOnboardingTour();
  });
  document.getElementById("onb-btn-know").addEventListener("click", function () {
    welcomeOverlay.style.display = "none";
    markSeen();
  });
  document.getElementById("onb-btn-used").addEventListener("click", function () {
    welcomeOverlay.style.display = "none";
    markSeen();
  });

  function maybeShowWelcome() {
    var seen = false;
    try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) {}
    if (seen) return;
    var tries = 0;
    (function wait() {
      if (bottomNavBtn("امروز") || tries > 20) {
        welcomeOverlay.style.display = "flex";
        return;
      }
      tries++;
      setTimeout(wait, 200);
    })();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(maybeShowWelcome, 300); });
  } else {
    setTimeout(maybeShowWelcome, 300);
  }
})();
