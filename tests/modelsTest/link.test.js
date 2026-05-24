import {Link} from '../../models';
import {cleanup, connect, disconnect} from './helpers';

const linkDoc = {
    url: ['https://example.com'],
    title: 'FACEBOOK',
    linkType: 'SOCIAL',
};

describe('Link model', () => {
    beforeAll(async () => {
        await connect();
    });
    afterEach(async () => {
        await cleanup();
    });
    afterAll(async () => {
        await disconnect();
    });

    it('setLink', async () => {
        const created = await Link.create(linkDoc);
        expect(created && created._id).toBeTruthy();
    });

    it('getLink', async () => {
        const created = await Link.create(linkDoc);
        const found = await Link.findById(created._id);
        expect(found).toBeTruthy();
        expect(Array.isArray(found.url)).toBe(true);
        expect(found.url[0]).toBe(linkDoc.url[0]);
        if (linkDoc.title) {
            expect(found.title).toBe(linkDoc.title);
        }
    });

    it('deleteLink', async () => {
        const created = await Link.create(linkDoc);
        await Link.deleteOne({_id: created._id});
        const missing = await Link.findById(created._id);
        expect(missing).toBeNull();
    });
});
