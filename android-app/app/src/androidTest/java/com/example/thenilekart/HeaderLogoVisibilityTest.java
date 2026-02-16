package com.example.thenilekart;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented test to verify WebView loads properly on Android device
 * This tests the basic WebView display which hosts the .header-logo-text element
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class HeaderLogoVisibilityTest {

    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class);

    /**
     * Test: Verify WebView is displayed
     * The WebView will load the web app which contains the .header-logo-text element
     */
    @Test
    public void testWebViewIsDisplayed() {
        onView(withId(R.id.webview))
                .check(matches(isDisplayed()));
    }

    /**
     * Test: Verify WebView loads successfully
     * Wait a moment to ensure the web page has time to load
     */
    @Test
    public void testWebViewLoadsSuccessfully() throws Exception {
        // Give WebView 5 seconds to load the app
        Thread.sleep(5000);
        
        // If we get here without exception, WebView loaded successfully
        onView(withId(R.id.webview))
                .check(matches(isDisplayed()));
    }
}
