import { DuplicateDetector } from '../DuplicateDetector';
import { PersonaSettings } from '../../types';
import {
  createMockApp,
  createMockTFile,
  createMockTFolder,
  MockApp,
  MockTFile,
  MockTFolder,
} from '../../__tests__/mocks/obsidian';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;
  let mockApp: MockApp;
  let settings: PersonaSettings;

  beforeEach(() => {
    mockApp = createMockApp();
    settings = {
      personaRoot: '/vault/Projects/Persona',
      business: 'TestBusiness',
      zettelkastenPath: 'Resources/Zettlekasten',
      duplicateThreshold: 70,
      showRibbonIcon: true,
      showStatusBar: true,
      autoProcessOnSave: false,
      pollingEnabled: false,
      pollingIntervalMinutes: 5,
    };

    detector = new DuplicateDetector(mockApp as any, settings);
  });

  describe('extractTitle', () => {
    it('should extract title from markdown heading', () => {
      const content = '## Test Heading\n\nSome content';
      const title = detector.extractTitle(content);

      expect(title).toBe('Test Heading');
    });

    it('should extract title from h1 heading', () => {
      const content = '# Main Title\n\nContent';
      const title = detector.extractTitle(content);

      expect(title).toBe('Main Title');
    });

    it('should use first line if no heading and line is short', () => {
      const content = 'Short title\n\nMore content here';
      const title = detector.extractTitle(content);

      expect(title).toBe('Short title');
    });

    it('should clean markdown formatting from title', () => {
      const content = '**Bold Title** with *italic*';
      const title = detector.extractTitle(content);

      expect(title).toBe('Bold Title with italic');
    });

    it('should create snippet from long content without heading', () => {
      const content = 'This is a very long piece of content that goes on and on with many words that should be truncated to a reasonable length';
      const title = detector.extractTitle(content);

      expect(title).toContain('...');
      expect(title.split(' ').length).toBeLessThanOrEqual(6);
    });

    it('should handle empty content', () => {
      const content = '';
      const title = detector.extractTitle(content);

      expect(title).toBe('...');
    });
  });

  describe('extractTags', () => {
    it('should extract hashtags from content', () => {
      const content = 'Some text with #tag1 and #tag2';
      const tags = detector.extractTags(content);

      expect(tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle hashtags with hyphens', () => {
      const content = 'Text with #multi-word-tag';
      const tags = detector.extractTags(content);

      expect(tags).toEqual(['multi-word-tag']);
    });

    it('should deduplicate tags', () => {
      const content = '#tag1 some text #tag1 more #tag1';
      const tags = detector.extractTags(content);

      expect(tags).toEqual(['tag1']);
    });

    it('should return empty array when no tags', () => {
      const content = 'Content without any tags';
      const tags = detector.extractTags(content);

      expect(tags).toEqual([]);
    });

    it('should handle multiple different tags', () => {
      const content = '#javascript #typescript #programming';
      const tags = detector.extractTags(content);

      expect(tags).toEqual(['javascript', 'typescript', 'programming']);
    });
  });

  describe('findDuplicates', () => {
    it('should return empty array when zettelkasten path does not exist', async () => {
      mockApp.vault.getAbstractFileByPath = jest.fn(() => null);

      const duplicates = await detector.findDuplicates('Test Title');

      expect(duplicates).toEqual([]);
    });

    it('should find exact title match', async () => {
      const mockFolder = createMockTFolder('Resources/Zettlekasten');
      const mockFile = createMockTFile('Resources/Zettlekasten/Test Title.md');

      mockFolder.children = [mockFile];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockFolder);

      const duplicates = await detector.findDuplicates('Test Title');

      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates[0].matchScore).toBe(100);
      expect(duplicates[0].title).toBe('Test Title');
    });

    it('should skip index files', async () => {
      const mockFolder = createMockTFolder('Resources/Zettlekasten');
      const indexFile = createMockTFile('Resources/Zettlekasten/index.md');
      indexFile.basename = 'index';

      mockFolder.children = [indexFile];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockFolder);

      const duplicates = await detector.findDuplicates('index');

      expect(duplicates).toEqual([]);
    });

    it('should find partial matches above threshold', async () => {
      const mockFolder = createMockTFolder('Resources/Zettlekasten');
      // Use file names that will produce similarity scores >= 70%
      // "JavaScript" vs "JavaScripts" = ~91% similarity (Levenshtein distance of 1)
      const mockFile1 = createMockTFile('Resources/Zettlekasten/JavaScripts.md');
      // "JavaScript" vs "Java Script" = ~91% similarity (only 1 space difference)
      const mockFile2 = createMockTFile('Resources/Zettlekasten/Java Script.md');

      mockFolder.children = [mockFile1, mockFile2];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockFolder);

      const duplicates = await detector.findDuplicates('JavaScript');

      expect(duplicates.length).toBeGreaterThan(0);
      duplicates.forEach((dup) => {
        expect(dup.matchScore).toBeGreaterThanOrEqual(settings.duplicateThreshold);
      });
    });

    it('should sort results by match score descending', async () => {
      const mockFolder = createMockTFolder('Resources/Zettlekasten');
      const mockFile1 = createMockTFile('Resources/Zettlekasten/Test.md');
      const mockFile2 = createMockTFile('Resources/Zettlekasten/Test Title.md');
      const mockFile3 = createMockTFile('Resources/Zettlekasten/Testing.md');

      mockFile1.basename = 'Test';
      mockFile2.basename = 'Test Title';
      mockFile3.basename = 'Testing';

      mockFolder.children = [mockFile1, mockFile2, mockFile3];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockFolder);

      const duplicates = await detector.findDuplicates('Test');

      // Results should be sorted by score
      for (let i = 0; i < duplicates.length - 1; i++) {
        expect(duplicates[i].matchScore).toBeGreaterThanOrEqual(
          duplicates[i + 1].matchScore
        );
      }
    });

    it('should search recursively in nested folders', async () => {
      const mockRootFolder = createMockTFolder('Resources/Zettlekasten');
      const mockSubFolder = createMockTFolder('Resources/Zettlekasten/Subfolder');
      const mockFile = createMockTFile('Resources/Zettlekasten/Subfolder/Nested File.md');

      mockSubFolder.children = [mockFile];
      mockRootFolder.children = [mockSubFolder];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockRootFolder);

      const duplicates = await detector.findDuplicates('Nested File');

      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates[0].title).toBe('Nested File');
    });
  });

  describe('findRelatedSubjects', () => {
    it('should return empty array when zettelkasten path does not exist', async () => {
      mockApp.vault.getAbstractFileByPath = jest.fn(() => null);

      const subjects = await detector.findRelatedSubjects('Programming');

      expect(subjects).toEqual([]);
    });

    it('should find subject folders with similar names', async () => {
      const mockRootFolder = createMockTFolder('Resources/Zettlekasten');
      const mockSubjectFolder = createMockTFolder('Resources/Zettlekasten/Programming');
      const mockFile = createMockTFile('Resources/Zettlekasten/Programming/note.md');

      mockSubjectFolder.children = [mockFile];
      mockRootFolder.children = [mockSubjectFolder];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockRootFolder);

      const subjects = await detector.findRelatedSubjects('Programming Basics');

      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects[0].name).toBe('Programming');
    });

    it('should detect folders with index files', async () => {
      const mockRootFolder = createMockTFolder('Resources/Zettlekasten');
      const mockSubjectFolder = createMockTFolder('Resources/Zettlekasten/Topic');
      const indexFile = createMockTFile('Resources/Zettlekasten/Topic/index.md');
      indexFile.basename = 'index';

      mockSubjectFolder.children = [indexFile];
      mockRootFolder.children = [mockSubjectFolder];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockRootFolder);

      const subjects = await detector.findRelatedSubjects('Topic');

      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects[0].hasIndex).toBe(true);
    });

    it('should count markdown files in subject folders', async () => {
      const mockRootFolder = createMockTFolder('Resources/Zettlekasten');
      const mockSubjectFolder = createMockTFolder('Resources/Zettlekasten/Research');
      const mockFile1 = createMockTFile('Resources/Zettlekasten/Research/note1.md');
      const mockFile2 = createMockTFile('Resources/Zettlekasten/Research/note2.md');
      const mockFile3 = createMockTFile('Resources/Zettlekasten/Research/note3.md');

      mockSubjectFolder.children = [mockFile1, mockFile2, mockFile3];
      mockRootFolder.children = [mockSubjectFolder];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockRootFolder);

      const subjects = await detector.findRelatedSubjects('Research');

      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects[0].noteCount).toBe(3);
    });
  });

  describe('getAllSubjectFolders', () => {
    it('should return empty array when zettelkasten path does not exist', async () => {
      mockApp.vault.getAbstractFileByPath = jest.fn(() => null);

      const subjects = await detector.getAllSubjectFolders();

      expect(subjects).toEqual([]);
    });

    it('should collect all subject folders', async () => {
      const mockRootFolder = createMockTFolder('Resources/Zettlekasten');
      const mockFolder1 = createMockTFolder('Resources/Zettlekasten/Topic1');
      const mockFolder2 = createMockTFolder('Resources/Zettlekasten/Topic2');

      mockRootFolder.children = [mockFolder1, mockFolder2];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockRootFolder);

      const subjects = await detector.getAllSubjectFolders();

      expect(subjects).toHaveLength(2);
      expect(subjects[0].name).toBe('Topic1');
      expect(subjects[1].name).toBe('Topic2');
    });

    it('should collect nested subject folders recursively', async () => {
      const mockRootFolder = createMockTFolder('Resources/Zettlekasten');
      const mockParentFolder = createMockTFolder('Resources/Zettlekasten/Parent');
      const mockChildFolder = createMockTFolder('Resources/Zettlekasten/Parent/Child');

      mockParentFolder.children = [mockChildFolder];
      mockRootFolder.children = [mockParentFolder];
      mockApp.vault.getAbstractFileByPath = jest.fn(() => mockRootFolder);

      const subjects = await detector.getAllSubjectFolders();

      expect(subjects).toHaveLength(2);
      expect(subjects.map((s) => s.name)).toContain('Parent');
      expect(subjects.map((s) => s.name)).toContain('Child');
    });
  });
});
