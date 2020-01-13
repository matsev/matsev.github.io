---
title: How to mock MIDP RecordStore
categories:
    - embedded
    - Java
    - testing
tags:
    - Java
    - Java ME
    - jUnit
    - mock
    - PowerMock
---


### Challenge

PowerMock is a mocking framework that claims to have almost supernatural powers. According to its documentation it is able to mock both static and private methods, final classes, and other nasty things that would be insurmountable obstacles for other mock frameworks. As a result, it has been stated that it should be able to mock the MIDP RecordStore, but so far I have not seen a working example. I accepted the challenge.

### Getting Started

I decided that writing a unit test was the best way to get started. After all, mocking is usually used together with unit testing. In order to use RecordStore you must first open it. According to the [javadoc of RecordStore](http://java.sun.com/javame/reference/apis/jsr118/javax/microedition/rms/RecordStore.html), the method to be used is: `public static RecordStore openRecordStore(String recordStoreName, boolean createIfNecessary)`. A static method that returns an instance of the RecordStore object. Following the "Mocking static methods" guidelines on the [PowerMock web site](http://code.google.com/p/powermock/), it seemed to be a pretty straight forward task:

1.  Use the `@RunWith` annotation at the class-level of the test case.
2.  Use the `@PrepareForTest` annotation at the class-level of the test case.
3.  Use `PowerMock.mockStatic()` to mock all methods of this class.
4.  Use `PowerMock.replay()` to change the class to replay mode.
5.  Use `PowerMock.verify()` to change the class to verify mode.

Ok, a little more complicated than my ordinary EasyMock setup, but nothing to really worry about. In my case, I also needed to create a mock object of the RecordStore class itself because of the return value of the `openRecordStore()` method.

### The Setback

To my disappointment, my test failed with an `ExceptionInInitializerError`. I studied the code thoroughly to make sure that I had followed the instructions, but I concluded that error resided elsewhere. A closer look at the failure trace revealed: 

```bash
[...]
Caused by: java.lang.UnsupportedOperationException: getSlowingFactor is native
at javax.microedition.rms.RecordStore.getSlowingFactor(RecordStore.java)
at javax.microedition.rms.RecordStore.(RecordStore.java:2414)
[...]
```

Hmm, that is strange... According to the API, there should be no `getSlowingFactor()` in RecordStore? And it seems like it is called by the class initializer? When searching for an answer it seemed like this problem occurs if you have not configured the preverifier correctly. It sort of makes sense, I am not using a preverifier at all in my project and I did not like the idea of introducing one.

### Solution

Returning to the PowerMock documentation, I discovered instructions how to "Suppressing Unwanted Behavior", maybe this was the way forward? Soon, I found the annotation `@SuppressStaticInitializationFor`, I added it to my test case and voilÃ , I had successfully mocked the RecordStore!

### Reference Code

You can find the code needed to mock the RecordStore below. If you find it interesting, you can [download](/assets/bin/midp-recordstore-example.zip) a more complex example where a class that uses RecordStore for persistent storage is unit tested with aid of PowerMock.


```java
import static org.easymock.EasyMock.expect;
import static org.easymock.classextension.EasyMock.createMock;
import static org.junit.Assert.assertEquals;
import javax.microedition.rms.RecordStore;
import javax.microedition.rms.RecordStoreException;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.powermock.api.easymock.PowerMock;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.core.classloader.annotations.SuppressStaticInitializationFor;
import org.powermock.modules.junit4.PowerMockRunner;

@RunWith(PowerMockRunner.class)
@PrepareForTest(RecordStore.class)
@SuppressStaticInitializationFor("javax.microedition.rms.RecordStore")
public class RecordStoreMockTest {

	@Test
	public void testCreateRecordStoreMock() throws RecordStoreException {
		String recordStoreName = "record_store_name";

		// Create mocks
		PowerMock.mockStatic(RecordStore.class);
		RecordStore recordStoreMock = createMock(RecordStore.class);

		// Record behavior
		expect(RecordStore.openRecordStore(recordStoreName, true)).andReturn(
				recordStoreMock);

		// Replay behavior
		PowerMock.replay(RecordStore.class);

		// Execute test and verify result
		assertEquals(recordStoreMock, RecordStore.openRecordStore(recordStoreName, true));
		PowerMock.verify(RecordStore.class);
	}
}
```