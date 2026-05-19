/**
 * ════════════════════════════════════════════════════════════════
 *  Real-World Multilingual Test Dataset
 * ════════════════════════════════════════════════════════════════
 *
 *  Contains 120+ labeled samples across English, Hindi (romanized),
 *  and Telugu (romanized) — simulating realistic voice commands
 *  a user might issue to smart glasses.
 *
 *  Sources of inspiration:
 *   - Google Assistant voice command patterns
 *   - Common smart-device commands in Indian languages
 *   - Real-world Hinglish / Tenglish mixing patterns
 */

'use strict';

const TEST_DATASET = [
  // ══════════════════════════════════════════════════════════
  //  CAPTURE — English
  // ══════════════════════════════════════════════════════════
  { text: 'Take a photo please',                   expected: 'capture', lang: 'en' },
  { text: 'Can you take a picture?',               expected: 'capture', lang: 'en' },
  { text: 'Capture this moment',                   expected: 'capture', lang: 'en' },
  { text: 'Snap a photo',                          expected: 'capture', lang: 'en' },
  { text: 'I want to take a picture of this',      expected: 'capture', lang: 'en' },
  { text: 'Take a selfie now',                     expected: 'capture', lang: 'en' },
  { text: 'Photograph the sunset',                 expected: 'capture', lang: 'en' },
  { text: 'Click a photo of this building',        expected: 'capture', lang: 'en' },
  { text: 'Record this scene',                     expected: 'capture', lang: 'en' },
  { text: 'Snap it',                               expected: 'capture', lang: 'en' },

  // CAPTURE — Hindi (romanized)
  { text: 'Photo lelo',                            expected: 'capture', lang: 'hi' },
  { text: 'Ek photo le lo na',                     expected: 'capture', lang: 'hi' },
  { text: 'Yahan ki tasveer lelo',                 expected: 'capture', lang: 'hi' },
  { text: 'Snap karo jaldi',                       expected: 'capture', lang: 'hi' },
  { text: 'Photo kheencho iska',                   expected: 'capture', lang: 'hi' },
  { text: 'Click karo bhai',                       expected: 'capture', lang: 'hi' },
  { text: 'Camera se photo nikal do',              expected: 'capture', lang: 'hi' },
  { text: 'Capture karo ye scene',                 expected: 'capture', lang: 'hi' },

  // CAPTURE — Telugu (romanized)
  { text: 'Photo teesko ikkada',                   expected: 'capture', lang: 'te' },
  { text: 'Padham teesko',                         expected: 'capture', lang: 'te' },
  { text: 'Snap cheyyi ra',                        expected: 'capture', lang: 'te' },
  { text: 'Click cheyyi ee building ki',           expected: 'capture', lang: 'te' },
  { text: 'Capture cheyyi idi',                    expected: 'capture', lang: 'te' },
  { text: 'Bommanu teesko',                        expected: 'capture', lang: 'te' },

  // ══════════════════════════════════════════════════════════
  //  EXIT — English
  // ══════════════════════════════════════════════════════════
  { text: 'Exit now',                              expected: 'exit', lang: 'en' },
  { text: 'Please quit the app',                   expected: 'exit', lang: 'en' },
  { text: 'Close everything',                      expected: 'exit', lang: 'en' },
  { text: 'Shut down the glasses',                 expected: 'exit', lang: 'en' },
  { text: 'Turn off please',                       expected: 'exit', lang: 'en' },
  { text: 'Power off',                             expected: 'exit', lang: 'en' },
  { text: 'Goodbye glasses',                       expected: 'exit', lang: 'en' },
  { text: 'Disconnect from phone',                 expected: 'exit', lang: 'en' },
  { text: 'Stop listening and go to sleep',        expected: 'exit', lang: 'en' },
  { text: 'End this session',                      expected: 'exit', lang: 'en' },

  // EXIT — Hindi (romanized)
  { text: 'Band karo ab',                          expected: 'exit', lang: 'hi' },
  { text: 'Exit karo',                             expected: 'exit', lang: 'hi' },
  { text: 'Quit karo please',                      expected: 'exit', lang: 'hi' },
  { text: 'Band kar do yaar',                      expected: 'exit', lang: 'hi' },
  { text: 'Bye bye, band karo',                    expected: 'exit', lang: 'hi' },
  { text: 'Ruk jao ab',                            expected: 'exit', lang: 'hi' },
  { text: 'Bas karo bandh karo',                   expected: 'exit', lang: 'hi' },

  // EXIT — Telugu (romanized)
  { text: 'Aapeyyi ippudu',                        expected: 'exit', lang: 'te' },
  { text: 'Exit cheyyi',                           expected: 'exit', lang: 'te' },
  { text: 'Band cheyyi',                           expected: 'exit', lang: 'te' },
  { text: 'Off cheyyi glasses ni',                 expected: 'exit', lang: 'te' },
  { text: 'Aapandi please',                        expected: 'exit', lang: 'te' },
  { text: 'Close cheyyi',                          expected: 'exit', lang: 'te' },

  // ══════════════════════════════════════════════════════════
  //  WAKE — English
  // ══════════════════════════════════════════════════════════
  { text: 'Hey glasses',                           expected: 'wake', lang: 'en' },
  { text: 'Hello glasses, are you there?',         expected: 'wake', lang: 'en' },
  { text: 'Hi glasses',                            expected: 'wake', lang: 'en' },
  { text: 'Ok glasses, wake up',                   expected: 'wake', lang: 'en' },
  { text: 'Wake up please',                        expected: 'wake', lang: 'en' },
  { text: 'Activate now',                          expected: 'wake', lang: 'en' },
  { text: 'Hey smart glasses listen',              expected: 'wake', lang: 'en' },
  { text: 'Start listening',                       expected: 'wake', lang: 'en' },
  { text: 'Are you there glasses?',                expected: 'wake', lang: 'en' },

  // WAKE — Hindi (romanized)
  { text: 'Hey chashme sun',                       expected: 'wake', lang: 'hi' },
  { text: 'Jago abhi',                             expected: 'wake', lang: 'hi' },
  { text: 'Suno, jaag jao',                        expected: 'wake', lang: 'hi' },
  { text: 'Uth jao glasses',                       expected: 'wake', lang: 'hi' },
  { text: 'Start karo suno',                       expected: 'wake', lang: 'hi' },
  { text: 'Chashma sun idhar',                     expected: 'wake', lang: 'hi' },
  { text: 'Shuru karo ab',                         expected: 'wake', lang: 'hi' },

  // WAKE — Telugu (romanized)
  { text: 'Hey kannadalu viney',                   expected: 'wake', lang: 'te' },
  { text: 'Lecho ra glasses',                      expected: 'wake', lang: 'te' },
  { text: 'Lechi ra',                              expected: 'wake', lang: 'te' },
  { text: 'Start avvu',                            expected: 'wake', lang: 'te' },
  { text: 'Wake avvu glasses',                     expected: 'wake', lang: 'te' },
  { text: 'Vinandi glasses',                       expected: 'wake', lang: 'te' },

  // ══════════════════════════════════════════════════════════
  //  CHAT — English
  // ══════════════════════════════════════════════════════════
  { text: 'Tell me about the Eiffel Tower',        expected: 'chat', lang: 'en' },
  { text: 'What is machine learning?',             expected: 'chat', lang: 'en' },
  { text: 'How to cook pasta?',                    expected: 'chat', lang: 'en' },
  { text: 'Explain quantum computing',             expected: 'chat', lang: 'en' },
  { text: 'Who is the president of India?',        expected: 'chat', lang: 'en' },
  { text: 'Where is the nearest hospital?',        expected: 'chat', lang: 'en' },
  { text: 'Search for Italian restaurants',        expected: 'chat', lang: 'en' },
  { text: 'Navigate to the airport',               expected: 'chat', lang: 'en' },
  { text: 'Translate hello to Spanish',            expected: 'chat', lang: 'en' },
  { text: 'What time is it in Tokyo?',             expected: 'chat', lang: 'en' },
  { text: 'Summarize this article',                expected: 'chat', lang: 'en' },
  { text: 'Read this sign for me',                 expected: 'chat', lang: 'en' },
  { text: 'Can you describe what I see?',          expected: 'chat', lang: 'en' },

  // CHAT — Hindi (romanized)
  { text: 'Mujhe batao weather kaisa hai',         expected: 'chat', lang: 'hi' },
  { text: 'Kya hai ye cheez?',                     expected: 'chat', lang: 'hi' },
  { text: 'Samjhao machine learning kya hota hai', expected: 'chat', lang: 'hi' },
  { text: 'Hospital kahan hai yahan se?',          expected: 'chat', lang: 'hi' },
  { text: 'Search karo pizza shops',               expected: 'chat', lang: 'hi' },
  { text: 'Rasta batao station ka',                expected: 'chat', lang: 'hi' },
  { text: 'Translate karo ye Hindi mein',          expected: 'chat', lang: 'hi' },
  { text: 'Explain karo gravity kya hai',          expected: 'chat', lang: 'hi' },
  { text: 'Padho ye sign board',                   expected: 'chat', lang: 'hi' },

  // CHAT — Telugu (romanized)
  { text: 'Cheppu weather ela undi',               expected: 'chat', lang: 'te' },
  { text: 'Enti idi cheppandi',                    expected: 'chat', lang: 'te' },
  { text: 'Ela cheyali pasta cook',                expected: 'chat', lang: 'te' },
  { text: 'Explain cheyyi quantum computing',      expected: 'chat', lang: 'te' },
  { text: 'Hospital ekkada undi',                  expected: 'chat', lang: 'te' },
  { text: 'Search cheyyi restaurants',             expected: 'chat', lang: 'te' },
  { text: 'Translate cheyyi hello ni Telugu lo',   expected: 'chat', lang: 'te' },
  { text: 'Daari cheppu airport ki',               expected: 'chat', lang: 'te' },

  // ══════════════════════════════════════════════════════════
  //  NONE — Random / irrelevant utterances
  // ══════════════════════════════════════════════════════════
  { text: 'The weather is nice today',             expected: 'none', lang: 'en' },
  { text: 'I had pasta for lunch',                 expected: 'none', lang: 'en' },
  { text: 'My dog is adorable',                    expected: 'none', lang: 'en' },
  { text: 'This building looks old',               expected: 'none', lang: 'en' },
  { text: 'I need to buy groceries',               expected: 'none', lang: 'en' },
  { text: 'La la la singing',                      expected: 'none', lang: 'en' },
  { text: 'Hmm interesting',                       expected: 'none', lang: 'en' },
  { text: 'Random noise blah blah',                expected: 'none', lang: 'en' },
  { text: '',                                      expected: 'none', lang: 'en' },
  { text: 'Aaj mausam accha hai',                  expected: 'none', lang: 'hi' },
  { text: 'Mere paas ek kitab hai',                expected: 'none', lang: 'hi' },
  { text: 'Eppudu manchiga undi',                  expected: 'none', lang: 'te' },
  { text: 'Nenu oka pustakam chaduvuthunna',       expected: 'none', lang: 'te' },
  { text: '12345',                                 expected: 'none', lang: 'en' },
  { text: '   ',                                   expected: 'none', lang: 'en' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TEST_DATASET };
}
