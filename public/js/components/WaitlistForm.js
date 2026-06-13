const WaitlistForm = {
  props: {
    // 'consumer' (default) or 'shop' — drives copy, fields, and signup type.
    audience: { type: String, default: 'consumer' },
    // 'card' (default) or 'inline' — inline is the compact hero variant:
    // one row (email + submit), note below, condensed success state.
    variant: { type: String, default: 'card' },
  },
  data() {
    return {
      email: '',
      shopName: '',
      hp: '', // honeypot — must stay empty for real users
      error: '',
      errorField: '', // 'email' | 'shopName' | '' — which input failed
      submitted: false,
      duplicate: false, // true when the email was already on the list
      submitting: false,
    };
  },
  computed: {
    isShop() { return this.audience === 'shop'; },
    isInline() { return this.variant === 'inline'; },
    emailId() {
      if (this.isShop) return 'shop-email';
      return this.isInline ? 'hero-email' : 'wl-email';
    },
    errorId() { return this.emailId + '-error'; },
    emailLabel() { return this.isShop ? 'Work email' : 'Your email'; },
    emailPlaceholder() { return this.isShop ? 'name@yourshop.com' : 'you@example.com'; },
    buttonLabel() {
      if (this.submitting) return this.isShop ? 'Sending…' : 'Claiming your spot…';
      if (this.isInline) return 'Get early access →';
      return this.isShop ? 'Request shop access →' : 'Claim early access →';
    },
    noteText() {
      if (this.isShop) return "We'll reach out to set your shop up before launch. No commitment.";
      return this.isInline
        ? 'Free at launch · no account · unsubscribe anytime'
        : 'Free to join · one email at launch · unsubscribe anytime';
    },
  },
  methods: {
    // Typo escape hatch: back to the form with the email kept for editing.
    editEmail() {
      this.submitted = false;
      this.duplicate = false;
      this.error = '';
      this.errorField = '';
      this.$nextTick(() => {
        const input = document.getElementById(this.emailId);
        if (input) input.focus();
      });
    },
    validate() {
      if (this.isShop && !this.shopName.trim()) {
        return { field: 'shopName', message: 'Shop name is required.' };
      }
      if (!this.email.trim()) {
        return { field: 'email', message: 'Email is required.' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
        return { field: 'email', message: 'Please enter a valid email address.' };
      }
      return null;
    },
    async submit() {
      const invalid = this.validate();
      this.error = invalid ? invalid.message : '';
      this.errorField = invalid ? invalid.field : '';
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
          this.duplicate = !!data.duplicate;
          this.submitted = true;
        } else {
          this.error = data.error;
          this.errorField = 'email';
        }
      } catch {
        this.error = 'Something went wrong. Please try again.';
        this.errorField = '';
      } finally {
        this.submitting = false;
      }
    },
  },
  template: `
    <div v-if="submitted" class="form-success" :class="{ 'form-success--inline': isInline }" role="status">
      <div class="form-success__mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="form-success__title">You're in.</p>
      <p v-if="isShop && duplicate" class="form-success__body">You're already on the shop list. We'll reach out to <strong>{{ email }}</strong> before PowVal launches.</p>
      <p v-else-if="isShop" class="form-success__body">We'll reach out to <strong>{{ email }}</strong> to get <strong>{{ shopName }}</strong> set up before PowVal launches.</p>
      <p v-else-if="duplicate" class="form-success__body">You're already on the list. We'll reach you at <strong>{{ email }}</strong> when PowVal launches.</p>
      <p v-else class="form-success__body">First email, first access. We'll reach you at <strong>{{ email }}</strong> when PowVal launches.</p>
      <button type="button" class="form-success__again" @click="editEmail">Wrong email? Re-enter it</button>
    </div>
    <form v-else-if="isInline" class="form form--inline" @submit.prevent="submit" novalidate>
      <div class="form--inline__row">
        <label class="sr-only" :for="emailId">Your email</label>
        <input
          :id="emailId"
          class="form__input form--inline__input"
          :class="{ 'form__input--error': errorField === 'email' }"
          type="email"
          v-model="email"
          :placeholder="emailPlaceholder"
          autocomplete="email"
          enterkeyhint="go"
          required
          :aria-invalid="errorField === 'email' ? 'true' : null"
          :aria-describedby="errorField === 'email' ? errorId : null"
          :disabled="submitting"
        />
        <button class="form__submit form--inline__submit" type="submit" :disabled="submitting">
          <span v-if="submitting" class="form__spinner"></span>
          <span>{{ buttonLabel }}</span>
        </button>
      </div>
      <div class="hp-field" aria-hidden="true">
        <label>Website<input type="text" v-model="hp" tabindex="-1" autocomplete="off"/></label>
      </div>
      <p v-if="error" class="form__error" :id="errorId" role="alert">{{ error }}</p>
      <p class="form__note form--inline__note">{{ noteText }}</p>
    </form>
    <form v-else class="form" @submit.prevent="submit" novalidate>
      <div v-if="isShop" class="form__field">
        <label class="form__label" for="shop-name">Shop name</label>
        <input
          id="shop-name"
          class="form__input"
          :class="{ 'form__input--error': errorField === 'shopName' }"
          type="text"
          v-model="shopName"
          placeholder="Powder House Skis"
          autocomplete="organization"
          required
          :aria-invalid="errorField === 'shopName' ? 'true' : null"
          :aria-describedby="errorField === 'shopName' ? errorId : null"
          :disabled="submitting"
        />
      </div>
      <div class="form__field">
        <label class="form__label" :for="emailId">{{ emailLabel }}</label>
        <input
          :id="emailId"
          class="form__input"
          :class="{ 'form__input--error': errorField === 'email' }"
          type="email"
          v-model="email"
          :placeholder="emailPlaceholder"
          autocomplete="email"
          required
          :aria-invalid="errorField === 'email' ? 'true' : null"
          :aria-describedby="errorField === 'email' ? errorId : null"
          :disabled="submitting"
        />
      </div>
      <div class="hp-field" aria-hidden="true">
        <label>Website<input type="text" v-model="hp" tabindex="-1" autocomplete="off"/></label>
      </div>
      <p v-if="error" class="form__error" :id="errorId" role="alert">{{ error }}</p>
      <button class="form__submit" type="submit" :disabled="submitting">
        <span v-if="submitting" class="form__spinner"></span>
        <span>{{ buttonLabel }}</span>
      </button>
      <p class="form__note">{{ noteText }}</p>
    </form>
  `,
};
