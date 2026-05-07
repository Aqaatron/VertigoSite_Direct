// main.js
document.addEventListener('DOMContentLoaded', function() {
  // ========== 1. АНИМАЦИИ ПОЯВЛЕНИЯ (с учётом prefers-reduced-motion) ==========
  var animatedElements = document.querySelectorAll('[data-vr-animate]');
  if (animatedElements.length) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animatedElements.forEach(function(el) {
        el.classList.add('vr-visible');
      });
    } else {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var delay = parseInt(entry.target.dataset.vrDelay) || 0;
            setTimeout(function() {
              entry.target.classList.add('vr-visible');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
      animatedElements.forEach(function(el) {
        observer.observe(el);
      });
    }
  }

  // ========== 2. ЭФФЕКТ ПРИ СКРОЛЛЕ (затемнение навигации) ==========
  var nav = document.querySelector('.vr-nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 50) {
        nav.classList.add('vr-nav--scrolled');
      } else {
        nav.classList.remove('vr-nav--scrolled');
      }
    }, { passive: true });
  }

  // --- 2. Мобильный хедер / бургер ---
  const burger = document.getElementById('vr-nav-burger');
  const mobileMenu = document.getElementById('vr-nav-mobile');
  if (burger && mobileMenu) {
    const toggleMenu = () => {
      burger.classList.toggle('vr-nav__hamburger--open');
      mobileMenu.classList.toggle('vr-nav__mobile--open');
      document.body.classList.toggle('vr-no-scroll');
    };
    burger.addEventListener('click', toggleMenu);
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', toggleMenu);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('vr-nav__mobile--open')) toggleMenu();
    });
  }

  // --- 3. Плавный скролл по якорям ---
  document.querySelectorAll('a[href^="#vr-"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 72;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- 4. Аккордеон FAQ (закрывать другие при открытии) ---
  document.querySelectorAll('.vr-faq__item').forEach(item => {
    item.addEventListener('toggle', function() {
      if (this.open) {
        document.querySelectorAll('.vr-faq__item').forEach(other => {
          if (other !== this && other.open) other.open = false;
        });
      }
    });
  });

  // --- 5. Карусель отзывов ---
  const track = document.getElementById('vr-reviews-track');
  if (track) {
    const cards = track.querySelectorAll('.vr-review');
    const prevBtn = document.querySelector('.vr-reviews__arrow--prev');
    const nextBtn = document.querySelector('.vr-reviews__arrow--next');
    const dotsContainer = document.getElementById('vr-reviews-dots');
    if (cards.length && dotsContainer) {
      cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'vr-reviews__dot' + (i === 0 ? ' vr-reviews__dot--active' : '');
        dot.addEventListener('click', () => {
          const scrollTarget = cards[i].offsetLeft - (track.offsetWidth / 2) + (cards[i].offsetWidth / 2);
          track.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        });
        dotsContainer.appendChild(dot);
      });
      const dots = dotsContainer.querySelectorAll('.vr-reviews__dot');
      const getActiveIndex = () => {
        const center = track.getBoundingClientRect().left + track.offsetWidth / 2;
        let closest = 0, min = Infinity;
        cards.forEach((card, i) => {
          const d = Math.abs(card.getBoundingClientRect().left + card.offsetWidth / 2 - center);
          if (d < min) { min = d; closest = i; }
        });
        return closest;
      };
      let scrollTimeout;
      track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const idx = getActiveIndex();
          dots.forEach((dot, i) => dot.classList.toggle('vr-reviews__dot--active', i === idx));
        }, 100);
      });
      const step = () => cards[0].offsetWidth + 24;
      if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    }
  }

  // --- Функция показа уведомления (toast) ---
  function showNotification(message, isError = false) {
    // Удаляем предыдущее уведомление, если есть
    const existingToast = document.querySelector('.vr-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'vr-toast' + (isError ? ' vr-toast--error' : '');
    toast.innerHTML = `
      <div class="vr-toast__icon">${isError ? '⚠️' : '✓'}</div>
      <div class="vr-toast__text">${message}</div>
    `;
    document.body.appendChild(toast);
    // Принудительный reflow для анимации
    toast.offsetHeight;
    toast.classList.add('vr-toast--show');
    setTimeout(() => {
      toast.classList.remove('vr-toast--show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }


  // --- 6. Форма: маска телефона, валидация, отправка с уведомлением ---
  const form = document.getElementById('vr-booking-form');
  const phoneInput = document.getElementById('vr-booking-phone');
  let isSubmitting = false; // Флаг для предотвращения повторной отправки

  if (form && phoneInput) {
    // маска телефона +7 (XXX) XXX-XX-XX
    phoneInput.addEventListener('input', function(e) {
      let x = this.value.replace(/\D/g, '');
      if (x.length === 0) { this.value = ''; return; }
      if (x[0] === '8') x = '7' + x.slice(1);
      if (x[0] !== '7') x = '7' + x;
      let formatted = '+7';
      if (x.length > 1) formatted += ' (' + x.substring(1, 4);
      if (x.length >= 4) formatted += ') ' + x.substring(4, 7);
      if (x.length >= 7) formatted += '-' + x.substring(7, 9);
      if (x.length >= 9) formatted += '-' + x.substring(9, 11);
      this.value = formatted;
    });
    phoneInput.addEventListener('focus', function() { if (!this.value) this.value = '+7'; });
    phoneInput.addEventListener('blur', function() { if (this.value === '+7' || this.value === '+7 (') this.value = ''; });

    const consentCheck = document.getElementById('vr-booking-consent');
    if (consentCheck) {
      consentCheck.addEventListener('change', function() {
        this.nextElementSibling.classList.remove('vr-form__checkbox-custom--error');
      });
    }

    const submitBtn = form.querySelector('.vr-booking__submit');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'Забронировать праздник';

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (isSubmitting) return;

      const name = document.getElementById('vr-booking-name').value.trim();
      const phoneRaw = document.getElementById('vr-booking-phone').value.replace(/\D/g, '');
      let isValid = true;

      document.querySelectorAll('.vr-form__input--error').forEach(el => el.classList.remove('vr-form__input--error'));
      if (name.length < 2) {
        document.getElementById('vr-booking-name').classList.add('vr-form__input--error');
        isValid = false;
      }
      if (phoneRaw.length < 11) {
        phoneInput.classList.add('vr-form__input--error');
        isValid = false;
      }
      if (consentCheck && !consentCheck.checked) {
        consentCheck.nextElementSibling.classList.add('vr-form__checkbox-custom--error');
        isValid = false;
      }
      if (!isValid) {
        showNotification('Пожалуйста, заполните все поля правильно', true);
        return;
      }

      // Блокируем кнопку
      isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Отправка...';
      }

      // Отправка заявки (используйте нужный эндпоинт)
      fetch('https://vertigovr.ru/api/sendForm', { // Для PHP
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          phone: phoneRaw,
          comment: 'Заявка с сайта вертиго64'
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('✅ Заявка успешно отправлена', data);
        showNotification('Заявка отправлена! Мы скоро с Вами свяжемся');
        if (typeof ym !== 'undefined') {
          ym(109107756, 'reachGoal', 'send_form');
          console.log('Метрика: отправлена цель send_form');
        } else {
          console.warn('Метрика не загружена');
        }
        // Опционально: очистить форму
        form.reset();
        if (phoneInput) phoneInput.value = '';
      })
      .catch(error => {
        console.error('❌ Ошибка при отправке заявки:', error);
        showNotification('Ошибка отправки. Попробуйте позже или напишите нам в Telegram', true);
      })
      .finally(() => {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = originalBtnText;
        }
      });
    });
  }

  // --- 7. (Опционально) Динамический фавикон с буквой "В" ---
  (function() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, '#E85D15');
    grad.addColorStop(1, '#6B5CE7');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 64, 64, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('В', 32, 35);
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.rel = 'shortcut icon';
    link.type = 'image/png';
    link.href = canvas.toDataURL('image/png');
    document.head.appendChild(link);
  })();
});

// вспомогательная функция для roundRect (если не определена)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x+r, y);
    this.lineTo(x+w-r, y);
    this.quadraticCurveTo(x+w, y, x+w, y+r);
    this.lineTo(x+w, y+h-r);
    this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    this.lineTo(x+r, y+h);
    this.quadraticCurveTo(x, y+h, x, y+h-r);
    this.lineTo(x, y+r);
    this.quadraticCurveTo(x, y, x+r, y);
    return this;
  };
}