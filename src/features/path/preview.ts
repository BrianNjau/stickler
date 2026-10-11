// Fixture for the Path preview (docs/design/Path, polished per docs/POLISH.md) until WP10.
export interface PathStage {
  title: string;
  body: string;
  state: 'done' | 'current' | 'next';
  milestones?: { title: string; when: string; done: boolean }[];
}
export interface PathTrack {
  key: string;
  label: string;
  goal: string;
  stages: PathStage[];
}

export const pathPreview: { intro: string; tracks: PathTrack[]; snitchLine: string } = {
  intro: 'Two tracks, one destination: you pick the employer, or you don’t need one.',
  tracks: [
    {
      key: 'job',
      label: 'Track A · Job',
      goal: 'A senior role that pays like a founder',
      stages: [
        { title: 'Cloud credentials', body: 'SAA, Terraform and CKA on the CV.', state: 'done' },
        {
          title: 'Architect credentials',
          body: 'SA Professional and TOGAF: the pair that gets you read as an architect, not a senior dev.',
          state: 'current',
          milestones: [
            { title: 'SA Professional', when: 'Feb 2027', done: true },
            { title: 'TOGAF 10', when: 'Mar 2027', done: false },
          ],
        },
        { title: 'Design portfolio', body: '10 written design docs. Staff-level hiring runs on written reasoning.', state: 'next' },
        { title: 'Interview machine', body: '150 problems, 8 mocks. The part nobody enjoys.', state: 'next' },
        { title: 'Offer in hand', body: 'Negotiated at least once.', state: 'next' },
      ],
    },
    {
      key: 'business',
      label: 'Track B · Business',
      goal: 'Consulting income that doesn’t need a boss',
      stages: [
        { title: 'Offer written', body: 'One page: who, what, how much.', state: 'done' },
        {
          title: 'First client',
          body: 'One paid engagement, start to invoice.',
          state: 'current',
          milestones: [
            { title: '20 real conversations', when: 'Dec 2026', done: false },
            { title: 'First invoice paid', when: 'Feb 2027', done: false },
          ],
        },
        { title: 'Three clients', body: 'Repeatable, not accidental.', state: 'next' },
        { title: 'Runs without heroics', body: 'A month with no rescue weekends.', state: 'next' },
      ],
    },
  ],
  snitchLine: 'Architecture: 40 XP this week. The design docs are not writing themselves. I checked.',
};
