# Third-party notices

The original Cuigengji software remains copyright (c) 2026 mistnest, under the MIT license in LICENSE.

## Oh Story writing methods

The writing methods in `skills/cuigengji-story/`, the related additions to the existing writing/revision Skills, and the workflow concepts implemented by the native story workbench are adapted and distilled from **@oh-story/dsh 0.1.21**. The integration uses Cuigengji's own chapter IDs, storage, version checks, and operations; it does not bundle or require the Oh Story runtime.

`src/domain/story/detect/engine.js` is a port of the AI-flavor prose detector from `story-deslop`/`story-review` (`scripts/check-ai-patterns.js` and `scripts/style-whitelist.js`). The port keeps the detection rules and adds code-layer labels; it removes the command-line interface and never rewrites text. Findings are candidates for the author, not a quality score.

Sources:

- https://github.com/zenstory-ai/oh-story-dsh (package @oh-story/dsh, version 0.1.21)
- https://github.com/zenstory-ai/oh-story-claudecode (upstream writing Skills)
- `story-long-write`: workflow-setup, workflow-outline, workflow-chapter, workflow-daily, workflow-revision, reader-contract-and-progression, tracking-transaction, style-resolution, author-memory.
- `story-short-write`: workflow-design, workflow-draft, workflow-revision, short-deslop.
- `story-review`: review workflow and quality-rubric.
- `story-deslop`: expression, narrative-focus, story-logic and deslop-gates.

The upstream copyright and permission notice are retained below. No endorsement or affiliation is implied.

MIT License

Copyright (c) 2026 worldwonderer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
