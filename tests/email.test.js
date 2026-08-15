import { describe, it, expect } from 'vitest';
import { generateWelcomeEmailHtml, generateNewDeckEmailHtml } from '../api/email.js';

describe('Serverless Module - email.js', () => {
  it('deve gerar template HTML de boas-vindas com Dark Theme e dados do jogador', () => {
    const html = generateWelcomeEmailHtml('Danilo', 'danilmendes@gmail.com');
    expect(html).toContain('DANILO');
    expect(html).toContain('https://www.jornadatcgteam.com.br');
    expect(html).toContain('logo.png');
    expect(html).toContain('#060913');
    expect(html).toContain('#0d1225');
    expect(html).toContain('Clique aqui e acesse agora mesmo!');
  });

  it('deve gerar template HTML de novo deck com dados do arquétipo', () => {
    const html = generateNewDeckEmailHtml('Danilo', 'Charizard ex / Pidgeot');
    expect(html).toContain('Danilo');
    expect(html).toContain('Charizard ex / Pidgeot');
    expect(html).toContain('https://www.jornadatcgteam.com.br');
    expect(html).toContain('logo.png');
  });
});
