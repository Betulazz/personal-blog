<script setup lang="ts">
import { publicNavigation } from '~/config/siteIdentity'
import { usePublicSiteSettings } from '~/composables/usePublicSiteSettings'

const { identity, settings } = await usePublicSiteSettings()
const monogram = computed(() => identity.value.name.slice(0, 1))
</script>

<template>
  <footer class="site-footer">
    <UiPageContainer width="wide" class="site-footer__container">
      <div class="site-footer__grid">
        <div class="site-footer__identity">
          <NuxtLink
            class="site-footer__brand"
            to="/"
            :aria-label="`${identity.name}首页`"
          >
            <span class="site-footer__monogram" aria-hidden="true">{{
              monogram
            }}</span>
            <span>{{ identity.name }}</span>
          </NuxtLink>
          <p class="site-footer__note">{{ identity.footerNote }}</p>
          <p class="site-footer__description">
            {{ identity.description }}
          </p>
        </div>

        <nav class="site-footer__navigation" aria-label="页脚导航">
          <h2>继续探索</h2>
          <ul>
            <li v-for="item in publicNavigation" :key="item.href">
              <NuxtLink :to="item.href">{{ item.label }}</NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="site-footer__social">
          <h2>保持联系</h2>
          <ul>
            <li v-for="social in identity.socialLinks" :key="social.href">
              <a
                :href="social.href"
                target="_blank"
                rel="noopener noreferrer"
                referrerpolicy="no-referrer"
              >
                {{ social.label }}
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="site-footer__bottom">
        <span>
          {{ settings.footer.copyright || `© 2026 ${identity.name}` }}
        </span>
        <span>Built with care · Dark by design</span>
      </div>
    </UiPageContainer>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  border-top: var(--border-hairline) solid rgb(191 205 255 / 14%);
  background: linear-gradient(
    180deg,
    rgb(6 10 23 / 36%),
    rgb(5 9 22 / 88%) 36%
  );
}

.site-footer__container {
  padding-top: var(--space-16);
  padding-bottom: var(--space-6);
}

.site-footer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(9rem, 0.7fr));
  gap: var(--space-12);
  padding-bottom: var(--space-12);
}

.site-footer__identity,
.site-footer__navigation,
.site-footer__social {
  min-width: 0;
}

.site-footer__identity {
  max-width: 30rem;
}

.site-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.site-footer__monogram {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: var(--border-hairline) solid var(--glass-border-hover);
  border-radius: var(--radius-small);
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  box-shadow: var(--shadow-glow);
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: var(--text-small);
  letter-spacing: 0;
}

.site-footer__note,
.site-footer__description {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.site-footer__note {
  margin-top: var(--space-5);
  color: var(--color-text);
}

.site-footer__description {
  margin-top: var(--space-2);
  font-size: var(--text-small);
}

.site-footer h2 {
  margin: 0;
  color: var(--color-accent-soft);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.site-footer ul {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-5) 0 0;
  padding: 0;
  list-style: none;
}

.site-footer li {
  min-width: 0;
}

.site-footer li a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-small);
  transition:
    color var(--motion-duration-fast) var(--motion-ease-standard),
    transform var(--motion-duration-fast) var(--motion-ease-standard);
}

.site-footer li a:hover {
  color: var(--color-text);
  transform: translateX(var(--motion-distance-small));
}

.site-footer__bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3) var(--space-8);
  padding-top: var(--space-5);
  border-top: var(--border-hairline) solid rgb(191 205 255 / 11%);
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

@media (width <= 48rem) {
  .site-footer__container {
    padding-top: var(--space-12);
  }

  .site-footer__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-10) var(--space-6);
    padding-bottom: var(--space-10);
  }

  .site-footer__identity {
    grid-column: 1 / -1;
  }
}

@media (width <= 26.875rem) {
  .site-footer__grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-footer li a:hover {
    transform: none;
  }
}
</style>
