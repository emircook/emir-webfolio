/* =====================================================================
   Masaüstü davranışı
   - İkona/dock'a tıklayınca ilgili sayfa bir pencere olarak açılır
   - Her pencerenin gerçek bir adresi var; JS çalışmazsa bağlantı
     normal şekilde o sayfaya gider (bu yüzden href'ler gerçek)
   ===================================================================== */

(function () {
  "use strict";

  /* ------------------------- menü çubuğundaki saat ------------------------ */
  var saat = document.getElementById("saat");
  function saatiYaz() {
    if (!saat) return;
    var s = new Date();
    saat.textContent = s.toLocaleDateString("tr-TR", {
      weekday: "short", day: "numeric", month: "short"
    }) + "  " + s.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  saatiYaz();
  setInterval(saatiYaz, 30000);

  /* Buradan aşağısı yalnızca masaüstü sayfasında çalışır */
  var masaustu = document.querySelector(".masaustu");
  if (!masaustu || !document.body.classList.contains("masaustu-govde")) return;

  var acikPencereler = {};   // adres -> pencere elemanı
  var enUstKat = 10;
  var kademe = 0;

  /* --------------------------- pencere açma --------------------------- */

  function pencereAc(adres) {
    var yol = adres.split("#")[0];
    var capa = adres.split("#")[1];

    if (acikPencereler[yol]) {          // zaten açıksa öne getir
      oneGetir(acikPencereler[yol]);
      if (capa) kaydir(acikPencereler[yol], capa);
      return Promise.resolve();
    }

    return fetch(yol)
      .then(function (c) {
        if (!c.ok) throw new Error(c.status);
        return c.text();
      })
      .then(function (metin) {
        var gecici = document.createElement("div");
        gecici.innerHTML = metin;
        var pencere = gecici.querySelector(".pencere");
        if (!pencere) throw new Error("pencere bulunamadı");

        yerlestir(pencere);
        masaustu.appendChild(pencere);
        acikPencereler[yol] = pencere;
        pencere.dataset.adres = yol;

        baglantilariKur(pencere);
        oneGetir(pencere);
        if (capa) kaydir(pencere, capa);

        document.title = (pencere.dataset.baslik || "Emir Aşçı") + " · Emir Aşçı";
        return pencere;
      });
  }

  function kaydir(pencere, capa) {
    var hedef = pencere.querySelector("#" + CSS.escape(capa));
    if (hedef) hedef.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /* Pencereleri üst üste binmeyecek şekilde kademeli yerleştir */
  function yerlestir(pencere) {
    var dar = window.matchMedia("(max-width: 760px)").matches;
    if (dar) return;                       // mobilde tam ekran açılıyor
    var x = 340 + (kademe % 4) * 36;
    var y = 70 + (kademe % 4) * 30;
    pencere.style.left = x + "px";
    pencere.style.top = y + "px";
    kademe++;
  }

  function oneGetir(pencere) {
    enUstKat++;
    pencere.style.zIndex = enUstKat;
  }

  function kapat(pencere) {
    delete acikPencereler[pencere.dataset.adres];
    pencere.remove();
    if (!Object.keys(acikPencereler).length) {
      document.title = "Emir Aşçı — Grafik Tasarımcı · Portfolyo";
      history.replaceState(null, "", location.pathname);
    }
  }

  /* ---------------------- pencere içi davranışlar ---------------------- */

  function baglantilariKur(pencere) {
    pencere.addEventListener("mousedown", function () { oneGetir(pencere); });

    pencere.querySelectorAll("[data-eylem]").forEach(function (dugme) {
      dugme.addEventListener("click", function () {
        var e = dugme.dataset.eylem;
        if (e === "kapat") kapat(pencere);
        if (e === "kucult") pencere.classList.toggle("kucuk");
        if (e === "buyut") pencere.classList.toggle("tam-ekran");
      });
    });

    surukle(pencere);
  }

  /* Başlık çubuğundan sürükleme (fare + dokunma) */
  function surukle(pencere) {
    var baslik = pencere.querySelector(".pencere-basligi");
    if (!baslik) return;
    var basX = 0, basY = 0, ilkX = 0, ilkY = 0, suruklerken = false;

    function basla(olay) {
      if (olay.target.closest("button")) return;
      if (window.matchMedia("(max-width: 760px)").matches) return;
      var n = olay.touches ? olay.touches[0] : olay;
      suruklerken = true;
      basX = n.clientX; basY = n.clientY;
      ilkX = pencere.offsetLeft; ilkY = pencere.offsetTop;
      oneGetir(pencere);
      document.addEventListener("mousemove", hareket);
      document.addEventListener("mouseup", bitir);
      document.addEventListener("touchmove", hareket, { passive: false });
      document.addEventListener("touchend", bitir);
    }

    function hareket(olay) {
      if (!suruklerken) return;
      olay.preventDefault();
      var n = olay.touches ? olay.touches[0] : olay;
      var x = ilkX + (n.clientX - basX);
      var y = ilkY + (n.clientY - basY);
      pencere.style.left = Math.max(0, Math.min(x, window.innerWidth - 120)) + "px";
      pencere.style.top = Math.max(28, Math.min(y, window.innerHeight - 60)) + "px";
    }

    function bitir() {
      suruklerken = false;
      document.removeEventListener("mousemove", hareket);
      document.removeEventListener("mouseup", bitir);
      document.removeEventListener("touchmove", hareket);
      document.removeEventListener("touchend", bitir);
    }

    baslik.addEventListener("mousedown", basla);
    baslik.addEventListener("touchstart", basla, { passive: true });
  }

  /* --------------- masaüstündeki bağlantıları pencereye bağla --------------- */

  document.querySelectorAll("a[data-pencere]").forEach(function (bag) {
    bag.addEventListener("click", function (olay) {
      var adres = bag.getAttribute("href");
      olay.preventDefault();
      pencereAc(adres)
        .then(function () { history.pushState(null, "", "#" + adres.split(".html")[0]); })
        .catch(function () { window.location.href = adres; });  // fetch olmazsa sayfaya git
    });
  });

  /* Esc: en üstteki pencereyi kapat */
  document.addEventListener("keydown", function (olay) {
    if (olay.key !== "Escape") return;
    var hepsi = Object.values(acikPencereler);
    if (!hepsi.length) return;
    hepsi.sort(function (a, b) { return (+b.style.zIndex || 0) - (+a.style.zIndex || 0); });
    kapat(hepsi[0]);
  });

  /* Adres çubuğunda #akbank gibi bir çapa varsa o pencereyi aç */
  if (location.hash.length > 1) {
    pencereAc(location.hash.slice(1) + ".html").catch(function () {});
  }
})();
