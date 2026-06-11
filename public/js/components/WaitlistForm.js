const WaitlistForm = {
  props: {
    // 'consumer' (default) or 'shop' — drives copy, fields, and signup type.
    audience: { type: String, default: 'consumer' },
  },
  data() {
    return {
      email: '',
      shopName: '',
      hp: '', // honeypot — must stay empty for real users
      error: '',
      submitted: false,
      submitting: false,
    };
  },
  computed: {
    isShop() { return this.audience === 'shop'; },
    emailId() { return this.isShop ? 'shop-email' : 'wl-email'; },
    emailLabel() { return this.isShop ? 'Work email' : 'Your email'; },
    buttonLabel() {
      if (this.submitting) return this.isShop ? 'Sending…' : 'Claiming your spot…';
      return this.isShop ? 'Request shop access →' : 'Claim early access →';
    },
    noteText() {
      return this.isShop
        ? "We'll reach out to set your shop up before launch. No commitment."
        : 'Free to join · one email at launch · unsubscribe anytime';
    },
  },
  methods: {
    validate() {
      if (this.isShop && !this.shopName.trim()) return 'Shop name is required.';
      if (!this.email.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
        return 'Please enter a valid email address.';
      }
      return null;
    },
    async submit() {
      this.error = this.validate() || '';
      if (this.error) return;
      this.submitting = true;
      try {
        const res = await fetch('/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email.trim(),
            type: this.audience,
            shopName: this.shopName.trim(),
            hp: this.hp,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          this.submitted = true;
        } else {
          this.error = data.error;
        }
      } catch {
        this.error = 'Something went wrong. Please try again.';
      } finally {
        this.submitting = false;
      }
    },
  },
  template: `
    <div v-if="submitted" class="form-success">
      <div class="form-success__mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="form-success__title">You're in.</p>
      <p v-if="isShop" class="form-success__body">We'll reach out to <strong>{{ email }}</strong> to get <strong>{{ shopName }}</strong> set up before PowVal launches.</p>
      <p v-else class="form-success__body">First email, first access. We'll reach you at <strong>{{ email }}</strong> when PowVal launches.</p>
    </div>
    <form v-else class="form" @submit.prevent="submit" novalidate>
      <div v-if="isShop" class="form__field">
        <label class="form__label" for="shop-name">Shop name</label>
        <input
          id="shop-name"
          class="form__input"
          type="text"
          v-model="shopName"
          placeholder="Powder House Skis"
          autocomplete="organization"
          :disabled="submitting"
        />
      </div>
      <div class="form__field">
        <label class="form__label" :for="emailId">{{ emailLabel }}</label>
        <input
          :id="emailId"
          class="form__input"
          :class="{ 'form__input--error': error }"
          type="email"
          v-model="email"
          placeholder="you@example.com"
          autocomplete="email"
          :disabled="submitting"
        />
      </div>
      <div class="hp-field" aria-hidden="true">
        <label>Website<input type="text" v-model="hp" tabindex="-1" autocomplete="off"/></label>
      </div>
      <p v-if="error" class="form__error" role="alert">{{ error }}</p>
      <button class="form__submit" type="submit" :disabled="submitting">
        <span v-if="submitting" class="form__spinner"></span>
        <span>{{ buttonLabel }}</span>
      </button>
      <p class="form__note">{{ noteText }}</p>
    </form>
  `,
};
