#!/bin/bash
# Setup script for local code review skill
# This script helps configure the local code review environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
PLUGIN_DIR="$(dirname "$SKILL_DIR")"

echo "🔧 Setting up Local Code Review Skill"
echo "====================================="

# Check if we're in the right directory
if [[ ! -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ]]; then
    echo "❌ Error: Not in a plugin directory. Please run from the plugin root."
    exit 1
fi

# Check if claude-code is available
if ! command -v claude &> /dev/null; then
    echo "⚠️  Warning: 'claude' command not found. Make sure Claude Code is installed."
    echo "   You can still use this skill manually by loading the SKILL.md file."
fi

# Create local configuration template
create_config_template() {
    local config_file=".claude/local-code-review.md"

    if [[ ! -f "$config_file" ]]; then
        echo "📝 Creating configuration template: $config_file"
        mkdir -p ".claude"

        cat > "$config_file" << 'EOF'
---
# Local Code Review Configuration
# Customize these settings for your project

# Confidence threshold (0-100, default: 80)
# Higher = fewer issues reported, Lower = more issues reported
confidence_threshold: 80

# Focus areas for review
focus_areas:
  security: true      # Security vulnerabilities
  bugs: true          # Programming errors
  performance: false  # Performance issues
  accessibility: false # Accessibility concerns

# File patterns to ignore during review
ignore_patterns:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*.min.js"
  - "**/*.min.css"
  - "node_modules/**"
  - "dist/**"
  - "build/**"
  - ".next/**"
  - "coverage/**"
  - "**/*.generated.*"
  - "**/*.log"

# Specific files to always exclude
exclude_files:
  - "package-lock.json"
  - "yarn.lock"
  - "pnpm-lock.yaml"

# Custom review rules (optional)
# Add project-specific checks here
custom_rules: []
  # Example:
  # - name: "API Error Handling"
  #   pattern: "fetch\(|axios\("
  #   check: "Ensure proper error handling for API calls"

# Output preferences
output_format: "markdown"  # "markdown" or "json"
include_suggestions: true   # Include code suggestions when possible
max_issues_per_file: 10     # Limit issues per file to avoid spam
---
EOF
        echo "✅ Configuration template created"
    else
        echo "ℹ️  Configuration file already exists: $config_file"
    fi
}

# Create pre-commit hook template
create_precommit_hook() {
    local hook_file=".git/hooks/pre-commit"

    if [[ ! -d ".git" ]]; then
        echo "ℹ️  Not a git repository, skipping pre-commit hook setup"
        return
    fi

    if [[ ! -f "$hook_file" ]]; then
        echo "🔗 Creating pre-commit hook template"

        cat > "$hook_file" << 'EOF'
#!/bin/bash
# Pre-commit hook for local code review
# Runs code review on staged changes before commit

echo "🔍 Running code review on staged changes..."

# Check if claude command is available
if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude command not found, skipping code review"
    exit 0
fi

# Run code review on staged changes
if claude "review my staged changes for blocking issues"; then
    echo "✅ Code review passed"
    exit 0
else
    echo "❌ Code review found issues. Please fix before committing."
    echo "   Run 'claude \"review my staged changes\"' to see details."
    exit 1
fi
EOF

        chmod +x "$hook_file"
        echo "✅ Pre-commit hook created and made executable"
    else
        echo "ℹ️  Pre-commit hook already exists: $hook_file"
    fi
}

# Create VS Code tasks template
create_vscode_tasks() {
    local tasks_file=".vscode/tasks.json"

    if [[ ! -f "$tasks_file" ]]; then
        echo "💻 Creating VS Code tasks template"

        mkdir -p ".vscode"

        cat > "$tasks_file" << 'EOF'
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Review Current Changes",
            "type": "shell",
            "command": "claude",
            "args": ["review my current changes"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            }
        },
        {
            "label": "Review Staged Changes",
            "type": "shell",
            "command": "claude",
            "args": ["review my staged changes"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            }
        },
        {
            "label": "Review Specific File",
            "type": "shell",
            "command": "claude",
            "args": ["review this file"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            }
        }
    ]
}
EOF
        echo "✅ VS Code tasks created"
    else
        echo "ℹ️  VS Code tasks already exist: $tasks_file"
    fi
}

# Create example CLAUDE.md if it doesn't exist
create_example_claude_md() {
    local claude_file="CLAUDE.md"

    if [[ ! -f "$claude_file" ]]; then
        echo "📚 Creating example CLAUDE.md file"

        cat > "$claude_file" << 'EOF'
# CLAUDE.md - Project Guidelines

This file contains coding standards and guidelines for this project. The local code review skill uses this file to check compliance.

## Code Quality Standards

### Error Handling
- Always handle errors from external API calls
- Use try/catch blocks for async operations
- Provide meaningful error messages to users
- Log errors appropriately for debugging

### Security
- Never store sensitive data in localStorage or sessionStorage
- Validate all user inputs on both client and server
- Use parameterized queries for database operations
- Implement proper authentication and authorization

### Performance
- Avoid unnecessary re-renders in React components
- Use lazy loading for large components
- Optimize images and assets
- Minimize bundle size

### Testing
- Write unit tests for all utility functions
- Test error conditions and edge cases
- Maintain >80% code coverage
- Run tests before committing

## File Organization
- Group related components in feature directories
- Use index.js files for clean imports
- Keep components under 300 lines
- Separate business logic from presentation

## Naming Conventions
- Use PascalCase for component names
- Use camelCase for functions and variables
- Use kebab-case for file names
- Prefix custom hooks with "use"

## Documentation
- Document all public APIs
- Include JSDoc comments for complex functions
- Keep README files up to date
- Document breaking changes
EOF
        echo "✅ Example CLAUDE.md created"
    else
        echo "ℹ️  CLAUDE.md already exists"
    fi
}

# Run setup steps
create_config_template
create_precommit_hook
create_vscode_tasks
create_example_claude_md

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and customize .claude/local-code-review.md"
echo "2. Test the skill: claude \"review my current changes\""
echo "3. Commit your changes to enable the pre-commit hook"
echo ""
echo "For help, see the skill documentation in:"
echo "  $SKILL_DIR/SKILL.md"
