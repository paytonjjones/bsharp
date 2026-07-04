package com.bsharp.app

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TrainerStoreProfileTest {
    private lateinit var context: Context

    @Before
    fun resetStore() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        context.getSharedPreferences("bsharp_native_state", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
    }

    @Test
    fun creatingProfilesAndSwitchingRestoresProfileSpecificLevels() {
        val store = TrainerStore(context)

        store.saveProfile("Alpha", "invalid-test-avatar")
        store.saveLevel(2)
        val alphaId = store.currentProfileId()

        val beta = store.addProfile()
        store.saveProfile("Beta", "invalid-test-avatar")
        store.saveLevel(4)

        store.switchProfile(alphaId)
        assertEquals("Alpha", store.profileName())
        assertEquals(2, store.levelIndex())

        store.switchProfile(beta.id)
        assertEquals("Beta", store.profileName())
        assertEquals(4, store.levelIndex())

        val reloadedStore = TrainerStore(context)
        reloadedStore.switchProfile(alphaId)
        assertEquals("Alpha", reloadedStore.profileName())
        assertEquals(2, reloadedStore.levelIndex())

        reloadedStore.switchProfile(beta.id)
        assertEquals("Beta", reloadedStore.profileName())
        assertEquals(4, reloadedStore.levelIndex())
    }
}
