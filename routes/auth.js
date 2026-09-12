      // Génération d'un slug unique à partir du nom (ou de l'email en repli)
      slug = await genererSlugUnique(name || email, collectionUtilisateurs);

      // Calcul de la date de fin d'essai gratuit : maintenant + 7 jours
      const maintenant = new Date();
      const dateFinEssai = new Date(maintenant);
      dateFinEssai.setDate(dateFinEssai.getDate() + 7);
      const trialEndsAt = admin.firestore.Timestamp.fromDate(dateFinEssai);

      await referenceDocument.set({
        uid,
        email: email || null,
        displayName: name || null,
        photoURL: picture || null,
        slug,
        theme: {
          background: '#0A0A0A',
          text: '#FFFFFF',
        },
        links: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // Essai gratuit de 7 jours à la création du compte
        trialEndsAt,
        subscriptionActive: true,
        isTrialing: true,
        // Même valeur que trialEndsAt pour l'instant : sera remplacée à la
        // première activation d'une licence payante (voir routes/license.js)
        subscriptionExpiresAt: trialEndsAt,
      });
