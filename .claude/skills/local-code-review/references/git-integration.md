# Git Integration for Local Code Review

This document explains how the local code review skill integrates with git to analyze changes effectively.

## Change Detection Strategies

### 1. Git Status Analysis

```bash
# Get current working directory changes
git status --porcelain

# Output format:
# M  src/auth/login.ts      # Modified
# A  src/utils/helpers.js   # Added
# D  old-file.js           # Deleted
# ?? new-file.ts           # Untracked
```

### 2. Git Diff Analysis

```bash
# Get staged changes
git diff --cached --name-only

# Get unstaged changes
git diff --name-only

# Get unified diff with context
git diff -U3 HEAD~1
```

### 3. Commit Range Analysis

```bash
# Changes since last commit
git diff HEAD~1 --name-only

# Changes between branches
git diff main..feature-branch --name-only

# Changes in last N commits
git diff HEAD~3 HEAD --name-only
```

## File Type Detection

### Language-Specific Analysis

```bash
# Detect file types for appropriate review
case "${file##*.}" in
    ts|tsx) language="typescript" ;;
    js|jsx) language="javascript" ;;
    py) language="python" ;;
    rb) language="ruby" ;;
    go) language="golang" ;;
    rs) language="rust" ;;
    java) language="java" ;;
    *) language="unknown" ;;
esac
```

### Binary File Handling

```bash
# Skip binary files
if file "$filepath" | grep -q "binary"; then
    continue
fi
```

## Context Gathering

### Commit Message Analysis

```bash
# Get recent commit messages for context
git log --oneline -5

# Extract keywords for intent understanding
commit_msg=$(git log -1 --pretty=%B)
if echo "$commit_msg" | grep -i -q "fix\|bug\|issue"; then
    review_focus="bug_fixes"
elif echo "$commit_msg" | grep -i -q "feature\|add\|implement"; then
    review_focus="new_features"
fi
```

### Author Information

```bash
# Get author info for context
author_name=$(git log -1 --pretty=%an)
author_email=$(git log -1 --pretty=%ae)
```

## CLAUDE.md File Discovery

### Hierarchical Search Algorithm

```bash
# Find relevant CLAUDE.md files
find_claude_files() {
    local target_file="$1"
    local claude_files=()

    # Check project root
    if [[ -f "CLAUDE.md" ]]; then
        claude_files+=("CLAUDE.md")
    fi

    # Walk up directory tree
    local current_dir="$(dirname "$target_file")"
    while [[ "$current_dir" != "." && "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/CLAUDE.md" ]]; then
            claude_files+=("$current_dir/CLAUDE.md")
        fi
        current_dir="$(dirname "$current_dir")"
    done

    echo "${claude_files[@]}"
}
```

## Performance Optimization

### Large Repository Handling

```bash
# Limit diff size for performance
DIFF_SIZE_LIMIT=1000000  # 1MB
diff_size=$(git diff --cached | wc -c)

if (( diff_size > DIFF_SIZE_LIMIT )); then
    echo "Large diff detected ($diff_size bytes). Consider reviewing in smaller batches."
    exit 1
fi
```

### File Size Filtering

```bash
# Skip very large files
FILE_SIZE_LIMIT=1000000  # 1MB
file_size=$(stat -f%z "$file")

if (( file_size > FILE_SIZE_LIMIT )); then
    echo "Skipping large file: $file ($file_size bytes)"
    continue
fi
```

## Error Handling

### Git Repository Validation

```bash
# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Ensure we have commits
if ! git rev-parse HEAD > /dev/null 2>&1; then
    echo "Error: No commits in repository"
    exit 1
fi
```

### Clean Exit on Errors

```bash
trap 'echo "Code review interrupted"; exit 1' INT TERM

# Handle git command failures gracefully
if ! git_status=$(git status --porcelain 2>/dev/null); then
    echo "Error: Failed to get git status"
    exit 1
fi
```

## Integration Examples

### Pre-commit Hook Integration

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running local code review..."

# Run the review
if claude "review my staged changes"; then
    echo "✅ Code review passed"
    exit 0
else
    echo "❌ Code review found issues. Please fix before committing."
    exit 1
fi
```

### CI/CD Integration

```yaml
# .github/workflows/code-review.yml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Local Code Review
        run: |
          # Install claude-code if needed
          claude "review changes in this PR"
```

### VS Code Integration

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Review Current Changes",
      "type": "shell",
      "command": "claude",
      "args": ["review my current changes"],
      "group": "build"
    }
  ]
}
```
