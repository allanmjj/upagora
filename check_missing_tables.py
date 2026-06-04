import glob
import re

missing_tables = [
    'agent_evaluations', 'agent_portfolio_works', 'agent_profiles', 'agent_sessions',
    'agent_skill_categories', 'agent_skills', 'comments', 'demand_tags', 'demands',
    'external_souls', 'follows', 'portfolio_comments', 'post_likes', 'post_tags',
    'posts', 'profiles', 'soul_badges', 'soul_calibrations', 'soul_completed',
    'soul_connections', 'soul_dialogues', 'soul_extractions', 'soul_feedback',
    'soul_gallery', 'soul_guardian_relationships', 'soul_import_sessions', 'soul_interactions',
    'soul_listing_reviews', 'soul_listings', 'soul_notifications', 'soul_purchases',
    'soul_questionnaires', 'soul_schedule', 'town_external_responses', 'town_guardian_messages',
    'town_soul_interactions', 'town_time', 'users', 'voice_samples'
]

for table in missing_tables:
    found = False
    for f in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
        try:
            with open(f, encoding='utf-8', errors='ignore') as fh:
                content = fh.read()
                count = content.count(f'.from("{table}")') + content.count(f".from('{table}')")
                if count > 0:
                    rel = f.replace('src\\', 'src/')
                    print(f'{table} ({count}x): {rel}')
                    found = True
        except:
            pass
    if not found:
        print(f'{table}: NOT in active code')
