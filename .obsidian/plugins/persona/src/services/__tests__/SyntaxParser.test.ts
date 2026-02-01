import { SyntaxParser } from '../SyntaxParser';
import { SyntaxMatch } from '../../types';

describe('SyntaxParser', () => {
  let parser: SyntaxParser;

  beforeEach(() => {
    parser = new SyntaxParser();
  });

  describe('parse', () => {
    it('should parse basic research question syntax', () => {
      const content = '[?] What is the meaning of life?';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'research-question',
        content: 'What is the meaning of life?',
        line: 1,
      });
    });

    it('should handle multiple research questions', () => {
      const content = `
[?] First question
Some text
[?] Second question
More text
[?] Third question
      `.trim();

      const result = parser.parse(content);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('First question');
      expect(result[0].line).toBe(1);
      expect(result[1].content).toBe('Second question');
      expect(result[1].line).toBe(3);
      expect(result[2].content).toBe('Third question');
      expect(result[2].line).toBe(5);
    });

    it('should parse research questions in markdown list items', () => {
      const content = `
- [?] Bullet point question
* [?] Asterisk bullet question
+ [?] Plus bullet question
1. [?] Numbered list question
      `.trim();

      const result = parser.parse(content);

      expect(result).toHaveLength(4);
      expect(result[0].content).toBe('Bullet point question');
      expect(result[1].content).toBe('Asterisk bullet question');
      expect(result[2].content).toBe('Plus bullet question');
      expect(result[3].content).toBe('Numbered list question');
    });

    it('should handle indented list items', () => {
      const content = `
  - [?] Indented bullet question
    * [?] Double indented question
      `.trim();

      const result = parser.parse(content);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Indented bullet question');
      expect(result[1].content).toBe('Double indented question');
    });

    it('should trim whitespace from questions', () => {
      const content = '[?]   Question with spaces   ';
      const result = parser.parse(content);

      expect(result[0].content).toBe('Question with spaces');
    });

    it('should return empty array for content without questions', () => {
      const content = `
This is regular text
No questions here
Just plain content
      `.trim();

      const result = parser.parse(content);

      expect(result).toHaveLength(0);
    });

    it('should not match [?] in middle of line', () => {
      const content = 'Some text [?] not a question';
      const result = parser.parse(content);

      expect(result).toHaveLength(0);
    });

    it('should not match [?] without question text', () => {
      const content = '[?]';
      const result = parser.parse(content);

      expect(result).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const result = parser.parse('');

      expect(result).toHaveLength(0);
    });

    it('should handle complex markdown with mixed content', () => {
      const content = `
# Heading

Some paragraph text

- Regular list item
- [?] What is this about?
  - Nested item
  - [?] Nested question

1. Numbered item
2. [?] Another question

**Bold text** and _italic_

[?] Final question at end
      `.trim();

      const result = parser.parse(content);

      expect(result).toHaveLength(4);
      expect(result[0].content).toBe('What is this about?');
      expect(result[1].content).toBe('Nested question');
      expect(result[2].content).toBe('Another question');
      expect(result[3].content).toBe('Final question at end');
    });
  });

  describe('countQuestions', () => {
    it('should return correct count for multiple questions', () => {
      const content = `
[?] First
[?] Second
[?] Third
      `.trim();

      expect(parser.countQuestions(content)).toBe(3);
    });

    it('should return 0 for no questions', () => {
      const content = 'No questions here';

      expect(parser.countQuestions(content)).toBe(0);
    });

    it('should return 0 for empty content', () => {
      expect(parser.countQuestions('')).toBe(0);
    });
  });

  describe('getQuestions', () => {
    it('should extract question strings only', () => {
      const content = `
[?] First question
Some text
[?] Second question
      `.trim();

      const questions = parser.getQuestions(content);

      expect(questions).toEqual([
        'First question',
        'Second question',
      ]);
    });

    it('should return empty array when no questions', () => {
      const questions = parser.getQuestions('No questions');

      expect(questions).toEqual([]);
    });

    it('should preserve question order', () => {
      const content = `
[?] Question A
[?] Question B
[?] Question C
      `.trim();

      const questions = parser.getQuestions(content);

      expect(questions[0]).toBe('Question A');
      expect(questions[1]).toBe('Question B');
      expect(questions[2]).toBe('Question C');
    });
  });
});
