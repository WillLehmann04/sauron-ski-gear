const WaitlistForm = {
  data() {
    return {
      email: '',
      name: '',
      error: '',
      submitted: false,
      submitting: false,
    };
  },
  methods: {
    validate() {
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
          body: JSON.stringify({ email: this.email.trim(), name: this.name.trim() }),
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
      <p class="form-success__body">First email, first access. We'll reach you at <strong>{{ email }}</strong> when GearWorth launches.</p>
    </div>
    <form v-else class="form" @submit.prevent="submit" novalidate>
      <div class="form__field">
        <label class="form__label" for="wl-email">Email <span class="form__required">*</span></label>
        <input
          id="wl-email"
          class="form__input"
          :class="{ 'form__input--error': error }"
          type="email"
          v-model="email"
          placeholder="you@example.com"
          autocomplete="email"
          :disabled="submitting"
        />
      </div>
      <div class="form__field">
        <label class="form__label" for="wl-name">Name <span class="form__optional">(optional)</span></label>
        <input
          id="wl-name"
          class="form__input"
          type="text"
          v-model="name"
          placeholder="Your name"
          autocomplete="name"
          :disabled="submitting"
        />
      </div>
      <p v-if="error" class="form__error" role="alert">{{ error }}</p>
      <button class="form__submit" type="submit" :disabled="submitting">
        <span v-if="submitting" class="form__spinner"></span>
        <span>{{ submitting ? 'Joining…' : 'Get first access →' }}</span>
      </button>
    </form>
  `,
};
