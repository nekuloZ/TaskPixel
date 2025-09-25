# TaskPixel 标签系统重构设计文档

## 概述

本设计文档描述了 TaskPixel 标签系统的重构方案，旨在解决当前系统中的架构问题、数据一致性问题和用户体验 bug。重构将建立一个统一、可靠、高性能的标签管理系统。

## 架构

### 核心架构原则

1. **单一数据源**: 所有标签数据通过统一的 DataStore 管理
2. **事件驱动**: 使用 EventBus 实现组件间的松耦合通信
3. **API 统一**: 所有标签操作通过 TagManager API 进行
4. **状态管理**: 实现集中的状态管理和缓存机制
5. **错误边界**: 在每个层级实现适当的错误处理

### 系统层次结构

```
┌─────────────────────────────────────────┐
│              UI Components              │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │ TagInput    │ │ TagDisplay          │ │
│  │ TagSelector │ │ TagFilter           │ │
│  └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────┤
│            Service Layer                │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │ TagManager  │ │ TagValidator        │ │
│  │ TagRenderer │ │ TagSearchService    │ │
│  └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────┤
│             Data Layer                  │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │ DataStore   │ │ EventBus            │ │
│  │ TagCache    │ │ ErrorHandler        │ │
│  └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────┘
```

## 组件和接口

### 1. 重构的 TagManager

```javascript
TaskPixel.TagManager = {
  // 缓存管理
  _cache: {
    tags: null,
    lastUpdate: null,
    isValid: false
  },

  // 核心API
  getAllTags(): Tag[],
  getTagById(id: string): Tag | null,
  createTag(tagData: TagCreateData): TagResult,
  updateTag(id: string, updates: TagUpdateData): TagResult,
  deleteTag(id: string): TagResult,

  // 搜索和筛选
  searchTags(query: string): Tag[],
  getTagsByUsage(): Tag[],
  getTagsByName(): Tag[],

  // 关联管理
  addTagToTask(taskId: string, tagId: string): boolean,
  removeTagFromTask(taskId: string, tagId: string): boolean,
  addTagToGoal(taskId: string, goalId: string, tagId: string): boolean,
  removeTagFromGoal(taskId: string, goalId: string, tagId: string): boolean,

  // 数据验证和清理
  validateTag(tagData: any): ValidationResult,
  cleanupOrphanedTags(): CleanupResult,

  // 缓存管理
  invalidateCache(): void,
  refreshCache(): void
}
```

### 2. 统一的 TagInput 组件

```javascript
TaskPixel.TagInput = {
  // 组件状态
  instances: Map<string, TagInputInstance>,

  // 创建和管理
  create(container: HTMLElement, options: TagInputOptions): string,
  destroy(instanceId: string): void,

  // 事件处理
  show(instanceId: string): void,
  hide(instanceId: string): void,
  handleInput(instanceId: string, value: string): void,
  handleKeyboard(instanceId: string, event: KeyboardEvent): void,

  // 建议系统
  showSuggestions(instanceId: string, suggestions: Tag[]): void,
  hideSuggestions(instanceId: string): void,
  selectSuggestion(instanceId: string, tagId: string): void
}
```

### 3. 改进的 TagDisplay 组件

```javascript
TaskPixel.TagDisplay = {
  // 渲染方法
  renderTaskTags(taskId: string, container: HTMLElement): void,
  renderGoalTags(goalId: string, container: HTMLElement): void,
  renderTagList(tags: Tag[], container: HTMLElement, options: RenderOptions): void,

  // 交互处理
  handleTagClick(tagId: string, action: TagAction): void,
  handleTagRemove(tagId: string, context: TagContext): void,

  // 样式管理
  getTagStyles(tag: Tag, size: TagSize): CSSProperties,
  updateTagAppearance(tagElement: HTMLElement, tag: Tag): void
}
```

### 4. 新的 TagValidator 服务

```javascript
TaskPixel.TagValidator = {
  // 验证方法
  validateTagName(name: string): ValidationResult,
  validateTagColor(color: string): ValidationResult,
  validateTagData(data: any): ValidationResult,

  // 清理方法
  sanitizeTagName(name: string): string,
  normalizeTagData(data: any): Tag,

  // 重复检查
  checkDuplicates(name: string, excludeId?: string): Tag | null,
  suggestAlternatives(name: string): string[]
}
```

## 数据模型

### 标签数据结构

```typescript
interface Tag {
  id: string;
  name: string;
  display_text: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
  metadata?: {
    created_by?: string;
    category?: string;
    priority?: number;
  };
}

interface TagCreateData {
  name: string;
  color?: string;
  description?: string;
  metadata?: any;
}

interface TagUpdateData {
  name?: string;
  color?: string;
  description?: string;
  metadata?: any;
}

interface TagResult {
  success: boolean;
  tagId?: string;
  tag?: Tag;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 扩展的任务和目标数据结构

```typescript
interface Task {
  // 现有字段...
  tags?: string[];
  tag_metadata?: {
    [tagId: string]: {
      added_at: string;
      added_by?: string;
    };
  };
}

interface Goal {
  // 现有字段...
  tags?: string[];
  tag_metadata?: {
    [tagId: string]: {
      added_at: string;
      added_by?: string;
    };
  };
}
```

## 错误处理

### 错误类型定义

```javascript
const TagErrors = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DUPLICATE_TAG: "DUPLICATE_TAG",
  TAG_NOT_FOUND: "TAG_NOT_FOUND",
  TAG_IN_USE: "TAG_IN_USE",
  STORAGE_ERROR: "STORAGE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
};
```

### 错误处理策略

1. **验证错误**: 显示具体的验证消息，阻止操作继续
2. **重复标签**: 提供选择现有标签或创建变体的选项
3. **标签未找到**: 自动清理引用，记录警告
4. **标签使用中**: 显示使用位置，提供强制删除选项
5. **存储错误**: 提供重试机制，备份数据
6. **网络错误**: 离线模式支持，同步队列

### 错误恢复机制

```javascript
TaskPixel.TagErrorHandler = {
  // 错误处理
  handleError(error: TagError, context: ErrorContext): void,

  // 数据恢复
  recoverFromCorruption(): RecoveryResult,
  validateDataIntegrity(): IntegrityReport,

  // 用户通知
  showErrorMessage(error: TagError): void,
  showRecoveryOptions(options: RecoveryOption[]): void
}
```

## 测试策略

### 单元测试

1. **TagManager API 测试**

   - 标签 CRUD 操作
   - 搜索和筛选功能
   - 缓存机制
   - 错误处理

2. **TagValidator 测试**

   - 数据验证规则
   - 清理和规范化
   - 重复检测

3. **组件测试**
   - TagInput 交互
   - TagDisplay 渲染
   - 事件处理

### 集成测试

1. **跨页面数据同步**
2. **EventBus 通信**
3. **localStorage 持久化**
4. **错误恢复流程**

### 性能测试

1. **大量标签加载**
2. **搜索响应时间**
3. **内存使用优化**
4. **DOM 更新效率**

## 实施计划

### 阶段 1: 核心重构

- 重构 TagManager API
- 实现统一的数据访问层
- 建立错误处理框架

### 阶段 2: 组件重构

- 重构 TagInput 组件
- 重构 TagDisplay 组件
- 实现 TagValidator 服务

### 阶段 3: 用户界面改进

- 优化交互体验
- 改进视觉设计
- 实现响应式布局

### 阶段 4: 性能优化

- 实现缓存机制
- 优化 DOM 操作
- 添加防抖和节流

### 阶段 5: 测试和修复

- 全面测试
- 修复发现的问题
- 性能调优

## 向后兼容性

### 数据迁移

```javascript
TaskPixel.TagMigration = {
  // 版本检测
  detectDataVersion(): string,

  // 迁移执行
  migrateFromV1(): MigrationResult,
  migrateFromV2(): MigrationResult,

  // 数据备份
  backupData(): BackupResult,
  restoreData(backup: BackupData): RestoreResult
}
```

### API 兼容性

- 保持现有 API 的向后兼容性
- 添加废弃警告
- 提供迁移指南

## 监控和日志

### 性能监控

```javascript
TaskPixel.TagMetrics = {
  // 性能指标
  trackOperationTime(operation: string, duration: number): void,
  trackCacheHitRate(): void,
  trackErrorRate(): void,

  // 使用统计
  trackTagUsage(tagId: string): void,
  trackSearchQueries(query: string): void,

  // 报告生成
  generatePerformanceReport(): PerformanceReport,
  generateUsageReport(): UsageReport
}
```

### 调试支持

```javascript
TaskPixel.TagDebug = {
  // 调试信息
  dumpTagData(): any,
  validateSystemState(): ValidationReport,

  // 开发工具
  enableDebugMode(): void,
  logTagOperations(enabled: boolean): void
}
```

这个设计提供了一个全面的解决方案来解决当前标签系统中的问题，同时为未来的扩展和维护奠定了坚实的基础。
