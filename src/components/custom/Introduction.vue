<!-- 介绍组件 -->
<script setup lang="ts">
defineOptions({ name: 'Introduction' });
</script>

<template>
  <div class="introduction-container">
    <div class="introduction-card">
      <div class="introduction-header">
        <h1 class="introduction-title">项目介绍</h1>
        <div class="title-underline"></div>
      </div>
      <div class="introduction-content">
        <p class="introduction-description">该项目用于展示个人遇到的前端相关重难点问题以及解决方案的实现</p>
        <div class="introduction-link-wrapper">
          <span class="link-label">主项目完整介绍：</span>
          <a href="https://gukai.top/" target="_blank" rel="noopener noreferrer" class="introduction-link">
            https://gukai.top/
            <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.introduction-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.introduction-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 3rem 2.5rem;
  max-width: 800px;
  width: 100%;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.introduction-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);
}

.introduction-header {
  margin-bottom: 2rem;
  text-align: center;
}

.introduction-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-underline {
  width: 80px;
  height: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0 auto;
  border-radius: 2px;
}

.introduction-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.introduction-description {
  font-size: 1.125rem;
  line-height: 1.8;
  color: #4a5568;
  text-align: center;
  margin: 0;
}

.introduction-link-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.link-label {
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
}

.introduction-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #667eea;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: #ffffff;
  border: 2px solid transparent;
}

.introduction-link:hover {
  color: #764ba2;
  background: #f8f9ff;
  border-color: #667eea;
  transform: translateX(4px);
}

.introduction-link:active {
  transform: translateX(2px);
}

.link-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.introduction-link:hover .link-icon {
  transform: translate(2px, -2px);
}

@media (max-width: 768px) {
  .introduction-container {
    padding: 1rem;
    min-height: 50vh;
  }

  .introduction-card {
    padding: 2rem 1.5rem;
  }

  .introduction-title {
    font-size: 2rem;
  }

  .introduction-description {
    font-size: 1rem;
  }

  .introduction-link-wrapper {
    flex-direction: column;
    text-align: center;
  }
}
</style>
