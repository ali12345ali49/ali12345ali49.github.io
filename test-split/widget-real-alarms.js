
// یه لایه‌ی کوچیک و مشترک برای زدن آلارم واقعی سیستم‌عامل (اندروید/آیفون)
// از طریق پلاگین @capacitor/local-notifications.
//
// نکته‌ی مهم: این فایل هیچ کدی رو از جاهای قبلی (setTimeout / Notification مرورگر)
// حذف نمی‌کنه؛ فقط یه راه اضافه و مطمئن‌تر برای زمانی که اپ بسته یا در پس‌زمینه‌ست
// فراهم می‌کنه. اگه پلاگین در دسترس نباشه (مثلاً وقتی همین اپ توی خود مرورگر Chrome
// باز میشه)، این توابع بی‌سروصدا هیچ کاری نمی‌کنن و بقیه‌ی اپ عادی کار می‌کنه.
(function () {
  function getLN() {
    try {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
    } catch (e) {
      return null;
    }
  }

  // یه رشته (مثلاً آی‌دی کار یا عادت) رو به یه عدد صحیح ثابت تبدیل می‌کنه،
  // چون پلاگین LocalNotifications فقط آی‌دی عددی قبول می‌کنه.
  function hashId(str) {
    str = String(str || "");
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    var n = Math.abs(h);
    return n === 0 ? 1 : n;
  }

  var permCache = null;
  function ensurePermission() {
    var LN = getLN();
    if (!LN) return Promise.resolve(false);
    if (permCache === true) return Promise.resolve(true);
    return LN.checkPermissions()
      .then(function (res) {
        if (res && res.display === "granted") {
          permCache = true;
          return true;
        }
        return LN.requestPermissions().then(function (r2) {
          var ok = !!(r2 && r2.display === "granted");
          permCache = ok;
          return ok;
        });
      })
      .catch(function () {
        return false;
      });
  }

  // زمان‌بندی یک آلارم واقعی.
  // id: یه رشته‌ی یکتا (مثلاً "task-123" یا "hb-45-box-2") — خودش هش می‌شه.
  // title/body: متن نوتیفیکیشن.
  // when: یک Date یا timestamp (میلی‌ثانیه) — زمان دقیق فایر شدن.
  // برمی‌گردونه: Promise<boolean> (true یعنی با موفقیت زمان‌بندی شد).
  window.scheduleRealAlarm = function (id, title, body, when) {
    var LN = getLN();
    if (!LN) return Promise.resolve(false);
    var ts = when instanceof Date ? when.getTime() : Number(when);
    if (!ts || isNaN(ts) || ts <= Date.now()) return Promise.resolve(false);
    var numId = hashId(id);
    return ensurePermission().then(function (ok) {
      if (!ok) return false;
      return LN.schedule({
        notifications: [
          {
            id: numId,
            title: title || "یادآوری",
            body: body || "",
            schedule: { at: new Date(ts), allowWhileIdle: true },
          },
        ],
      })
        .then(function () {
          return true;
        })
        .catch(function () {
          return false;
        });
    });
  };

  // لغو یه آلارم واقعی که قبلاً با scheduleRealAlarm زمان‌بندی شده (با همون id).
  window.cancelRealAlarm = function (id) {
    var LN = getLN();
    if (!LN) return Promise.resolve(false);
    var numId = hashId(id);
    return LN.cancel({ notifications: [{ id: numId }] })
      .then(function () {
        return true;
      })
      .catch(function () {
        return false;
      });
  };

  // درخواست دستی مجوز نوتیفیکیشن (مثلاً موقع اولین باز کردن اپ یا زدن دکمه‌ی تنظیمات).
  window.requestRealAlarmPermission = ensurePermission;

  // true اگه اپ روی گوشی (Capacitor) در حال اجراست و پلاگین موجوده.
  window.bjHasRealAlarms = function () {
    return !!getLN();
  };
})();
