# Local Code Review Examples

This document provides practical examples of how to use the local code review skill in different development scenarios.

## Basic Usage Examples

### 1. Review Current Working Directory Changes

````
User: "Can you review the code changes I just made?"

Skill Analysis:
- Checks git status for modified files
- Analyzes staged and unstaged changes
- Reviews against CLAUDE.md guidelines
- Reports high-confidence issues only

Expected Output:
## Local Code Review Results

**Files Reviewed**: 3 files changed
**Issues Found**: 1 high-confidence issue
**Review Time**: 25 seconds

### 🔴 Critical Issues

#### 1. Missing Null Check - User Authentication
**File**: `src/auth/verifyUser.ts:42-48`
**Confidence**: 92/100

The function accesses `user.profile` without checking if `user` is null. This will throw a runtime error if authentication fails.

**Suggested Fix**:
```typescript
export function getUserProfile(userId: string): UserProfile | null {
  const user = getUserById(userId);
  if (!user) {
    return null; // Handle missing user gracefully
  }
  return user.profile;
}
````

```

### 2. Review Specific Files or Directories
```

User: "Please review the authentication code I just modified"

Skill Analysis:

- Focuses only on files in src/auth/ directory
- Analyzes recent changes to auth-related files
- Checks for security vulnerabilities and logic errors
- Validates against auth-specific CLAUDE.md rules

Expected Output:

## Local Code Review Results

**Files Reviewed**: 5 auth files
**Issues Found**: 2 high-confidence issues
**Review Time**: 35 seconds

### 🔴 Critical Issues

#### 1. SQL Injection Vulnerability

**File**: `src/auth/login.ts:78-85`
**Confidence**: 98/100

User input is directly concatenated into SQL query without parameterization.

#### 2. Weak Password Validation

**File**: `src/auth/password.ts:23-30`
**Confidence**: 85/100

Password requirements don't meet security standards defined in CLAUDE.md.

```

### 3. Review Before Committing
```

User: "I want to commit these changes, can you check them first?"

Skill Analysis:

- Reviews only staged changes (git diff --cached)
- Focuses on production-ready code quality
- Checks for any blocking issues before commit
- Provides quick feedback for immediate fixes

Integration Tip:
This works perfectly with pre-commit hooks:

```bash
#!/bin/bash
# .git/hooks/pre-commit
claude "review my staged changes"
```

```

## Advanced Usage Scenarios

### 4. Review with Specific Context
```

User: "I just implemented OAuth login with Google, can you check for security issues and bugs?"

Skill Analysis:

- Uses context "OAuth login with Google" to guide review
- Focuses on OAuth-specific security patterns
- Checks for common OAuth vulnerabilities
- Validates error handling for external API calls

Context-Aware Output:

- Flags missing state parameter validation
- Checks for proper token storage security
- Validates redirect URI handling
- Reviews error handling for OAuth failures

```

### 5. Review Large Feature Implementation
```

User: "I implemented the entire user management system, please review all the changes"

Skill Analysis:

- Handles multiple files and directories
- Maintains context across the entire feature
- Identifies architectural issues and inconsistencies
- Provides comprehensive feedback organized by component

Organized Output:

```
## User Management System Review

### 🔴 Critical Issues
**Database Layer**: 2 issues
**API Layer**: 3 issues
**Frontend Components**: 1 issue

### 📋 CLAUDE.md Compliance
**Architecture**: 1 violation
**Security**: 2 issues
```

```

### 6. Review After Test Failures
```

User: "My tests are failing, can you review the code for obvious bugs?"

Skill Analysis:

- Focuses on bug detection agents
- Looks for common causes of test failures
- Checks for logic errors and edge cases
- Prioritizes runtime error sources

Debugging-Focused Output:

- Identifies null pointer exceptions
- Finds unhandled promise rejections
- Catches infinite loop conditions
- Flags uninitialized variables

````

## Configuration Examples

### 7. Custom Review Configuration
```yaml
# .claude/local-code-review.md
---
confidence_threshold: 75
focus_areas:
  - security: true
  - performance: false
  - accessibility: true
ignore_patterns:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "node_modules/**"
custom_rules:
  - name: "API Response Validation"
    pattern: "res\.(json|send)\("
    check: "Validate response data before sending"
---
````

### 8. Project-Specific Guidelines

```
User: "Review this React component following our component guidelines"

Skill Analysis:
- Reads project-specific CLAUDE.md for React rules
- Applies component-specific quality checks
- Validates against established patterns
- Checks for accessibility and performance issues
```

## Integration Examples

### 9. VS Code Integration

```json
// .vscode/settings.json
{
  "claude.commands": {
    "review-current-file": "review this file",
    "review-workspace": "review all changes in workspace",
    "review-selection": "review the selected code"
  }
}
```

### 10. CI/CD Pipeline Integration

```yaml
# .github/workflows/code-review.yml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Local Code Review
        run: |
          claude "review changes since main branch"
        env:
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

### 11. Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Running code review..."

# Only review staged changes
if claude "review my staged changes for blocking issues"; then
    echo "✅ Code review passed"
else
    echo "❌ Please fix the issues found before committing"
    exit 1
fi
```

## Error Scenarios and Solutions

### 12. Handling Large Codebases

```
Problem: "Review is taking too long on a large codebase"

Solutions:
- "review changes in src/components/" (focus on specific directory)
- "review only the files I modified today" (limit scope)
- "review just the critical security changes" (provide context)
```

### 13. Dealing with Generated Code

```
Problem: "The review is flagging issues in generated files"

Solution: Create .claude/local-code-review.md:
---
ignore_patterns:
  - "dist/**"
  - "build/**"
  - "**/*.generated.*"
  - "**/*.min.js"
---
```

### 14. Custom Quality Gates

```
User: "Review this code for production readiness"

Skill Analysis:
- Applies stricter quality standards
- Checks for logging, error handling, tests
- Validates documentation completeness
- Reviews performance considerations
```

## Performance Tips

### 15. Optimizing Review Speed

- **Small batches**: Review 5-10 files at a time for faster feedback
- **Focused reviews**: Specify directories or file types to narrow scope
- **Incremental reviews**: Review changes as you make them rather than all at once
- **Configuration tuning**: Exclude irrelevant files (tests, generated code, etc.)

### 16. Quality vs Speed Trade-offs

```yaml
# Fast review (lower quality)
---
confidence_threshold: 90
focus_areas:
  - security: true
  - bugs: true
---
# Thorough review (slower)
---
confidence_threshold: 70
focus_areas:
  - security: true
  - bugs: true
  - performance: true
  - accessibility: true
---
```

## Specialized Review Types

### 17. Security-Focused Review

```
User: "Review this code for security vulnerabilities"

Skill Analysis:
- Prioritizes security patterns and checks
- Looks for injection vulnerabilities, auth bypasses
- Checks for sensitive data exposure
- Validates input sanitization
```

### 18. Performance Review

```
User: "Check this code for performance issues"

Skill Analysis:
- Identifies N+1 queries, memory leaks
- Flags inefficient algorithms
- Checks for blocking operations
- Reviews resource usage patterns
```

### 19. Accessibility Review

```
User: "Review this UI code for accessibility issues"

Skill Analysis:
- Checks ARIA labels and roles
- Validates keyboard navigation
- Reviews color contrast ratios
- Checks screen reader compatibility
```

## Troubleshooting Common Issues

### 20. No Issues Found

```
Possible reasons:
- Changes are high quality (great!)
- Files are ignored by configuration
- Changes are too small to trigger issues
- CLAUDE.md files are missing relevant rules

Try: "review with lower confidence threshold" or check configuration
```

### 21. Too Many Issues

```
Solutions:
- Focus on specific files: "review only src/auth/"
- Exclude test files: Configure ignore_patterns
- Review in batches: "review first 5 files"
- Adjust confidence threshold upward
```

### 22. Wrong File Types Analyzed

```
Fix: Update configuration to ignore irrelevant files:
---
ignore_patterns:
  - "**/*.log"
  - "**/*.min.css"
  - "coverage/**"
  - ".next/**"
---
```
