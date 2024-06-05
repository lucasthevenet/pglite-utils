import { prisma } from '../../db'

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
    const id = event.context.params?.id;

    const deletePost = await prisma.post.delete({
        where: {
            id: id
        }
    }) 
    .catch((error) => {
        console.error(error);
    });

    return deletePost;
});